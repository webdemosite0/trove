import "server-only";

import { listConnections, secretFor, type Connection } from "@/lib/connections";
import { SERVICES } from "@/lib/services";
import { canResolveConnectorToolkit } from "@/lib/tro-connector-tools";
import {
  formatSlackMessagesForModel,
  formatSlackWorkspaceMessagesForModel,
  isSlackToken,
  isSlackWebhook,
  listSlackChannels,
  recentSlackMessages,
  recentSlackMessagesAcrossChannels,
  slackIdentity,
} from "@/lib/slack";

export interface ChatConnectorContext {
  connectedNote: string;
  liveContext: string;
  requested: string[];
}

function mentionedServices(text: string) {
  return Array.from(
    new Set(
      [...text.matchAll(/@([a-z0-9][\w.-]*)/gi)].map((m) =>
        m[1].toLowerCase(),
      ),
    ),
  );
}

function requestedServices(text: string) {
  const requested = new Set(mentionedServices(text));
  if (/\bslack\b/i.test(text)) requested.add("slack");
  if (/\bgithub\b/i.test(text)) requested.add("github");
  return [...requested];
}

function connectionLabel(connection: Connection) {
  const meta = SERVICES.find((service) => service.id === connection.service);
  const name = meta?.name ?? connection.service;
  return connection.account ? name + " (" + connection.account + ")" : name;
}

function extractSlackChannel(text: string) {
  const match =
    text.match(/#([a-z0-9_-]+)/i) ||
    text.match(/\bchannel\s+#?([a-z0-9_-]+)/i) ||
    text.match(/\bin\s+#([a-z0-9_-]+)/i);
  const channel = String(match?.[1] ?? "").toLowerCase();
  if (
    !channel ||
    ["the", "a", "an", "my", "our", "this", "that", "channel"].includes(channel)
  ) {
    return "";
  }
  return channel;
}

function wantsRecentSlackMessages(text: string) {
  return /\b(new|newest|latest|recent|messages?|updates?|what(?:'s| is) happening|catch me up|summary|summarize|check)\b/i.test(
    text,
  );
}

async function slackContext(text: string, connected: boolean) {
  if (!connected) {
    return "SLACK CONNECTOR: Slack is not connected for this user. Tell them to connect Slack under Integrations.";
  }

  const token = await secretFor("slack");
  if (!token) {
    return (
      "SLACK CONNECTOR: Slack is connected, but Trove could not resolve a live OAuth/token credential. " +
      "Ask the user to reconnect Slack or run the integration sync. Do not say Slack is not connected."
    );
  }

  if (isSlackWebhook(token)) {
    return (
      "SLACK CONNECTOR: Slack is connected with an incoming webhook. It can post messages but cannot read channel history. " +
      "For reading, reconnect Slack with OAuth/bot access that includes channels:read and channels:history."
    );
  }

  if (!isSlackToken(token)) {
    return (
      "SLACK CONNECTOR: Slack is connected, but the stored credential is not a readable Slack OAuth/bot token. " +
      "Ask the user to reconnect Slack with read permissions."
    );
  }

  let identityLine = "";
  try {
    const identity = await slackIdentity(token);
    const parts = [identity.team, identity.user].filter(Boolean);
    if (parts.length) {
      identityLine = "LIVE SLACK ACCOUNT: " + parts.join(" — ") + ".\n";
    }
  } catch {
    // A token can still have channel access even if auth.test is unavailable.
  }

  const channel = extractSlackChannel(text);
  if (channel) {
    const result = await recentSlackMessages(token, channel, 20);
    return identityLine + formatSlackMessagesForModel(result.channelName, result.messages);
  }

  if (wantsRecentSlackMessages(text)) {
    const recent = await recentSlackMessagesAcrossChannels(token, {
      channelLimit: 12,
      perChannel: 5,
      totalLimit: 24,
    });
    return (
      identityLine +
      formatSlackWorkspaceMessagesForModel(
        recent.messages,
        recent.readableChannels,
        recent.skippedChannels,
      )
    );
  }

  const channels = await listSlackChannels(token, 30);
  return (
    identityLine +
    "LIVE SLACK DATA — channels visible to the connected credential:\n" +
    (channels.length
      ? channels
          .map(
            (channel) =>
              "- #" +
              channel.name +
              (channel.isPrivate ? " (private)" : "") +
              (channel.isMember ? " (joined)" : ""),
          )
          .join("\n")
      : "- No channels returned with the current Slack scopes.")
  );
}

async function githubContext(connected: boolean) {
  if (!connected) {
    return "GITHUB CONNECTOR: GitHub is not connected for this user. Tell them to connect GitHub under Integrations.";
  }

  const token = await secretFor("github");
  if (!token) {
    return (
      "GITHUB CONNECTOR: GitHub is connected, but Trove could not resolve a live credential. " +
      "Ask the user to reconnect GitHub. Do not say GitHub is not connected."
    );
  }

  const [profileRes, reposRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "User-Agent": "trove",
      },
    }),
    fetch("https://api.github.com/user/repos?per_page=20&sort=updated", {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "User-Agent": "trove",
      },
    }),
  ]);

  if (!reposRes.ok) {
    return (
      "GITHUB CONNECTOR: GitHub is connected, but its API returned " +
      reposRes.status +
      ". Ask the user to reconnect GitHub."
    );
  }

  const repos = (await reposRes.json()) as {
    full_name?: string;
    private?: boolean;
    html_url?: string;
    updated_at?: string;
  }[];
  const profile = profileRes.ok
    ? ((await profileRes.json()) as { login?: string; name?: string })
    : null;

  return (
    (profile
      ? "LIVE GITHUB ACCOUNT: " +
        (profile.name || profile.login || "connected user") +
        (profile.login ? " (@" + profile.login + ")" : "") +
        ".\n"
      : "") +
    "LIVE GITHUB DATA — recently updated repositories:\n" +
    repos
      .map(
        (repo) =>
          "- " +
          (repo.full_name || "repository") +
          (repo.private ? " (private)" : "") +
          (repo.updated_at ? " — updated " + repo.updated_at : ""),
      )
      .join("\n")
  );
}

export async function buildChatConnectorContext(
  lastUserText: string,
  opts?: { connectorTools?: boolean },
): Promise<ChatConnectorContext> {
  const requested = requestedServices(lastUserText);

  let connections: Connection[] = [];
  try {
    connections = await listConnections();
  } catch {
    connections = [];
  }

  const connectedSet = new Set(connections.map((connection) => connection.service));

  // The Tro always knows what's connected so it can suggest using apps
  // proactively. Live data is only fetched when the user @mentions a service.
  const connectedNote = connections.length
    ? "\n\nCONNECTED APPS: " +
      connections.map(connectionLabel).join(", ") +
      ". Mention them with @name in chat to pull live data (e.g. @slack, @github)."
    : "\n\nCONNECTED APPS: none. If the user wants app data, point them to /integrations.";

  if (!requested.length) {
    return { connectedNote, liveContext: "", requested: [] };
  }

  const liveParts: string[] = [];

  for (const service of requested) {
    try {
      if (service === "slack") {
        liveParts.push(await slackContext(lastUserText, connectedSet.has("slack")));
        continue;
      }
      if (service === "github") {
        liveParts.push(await githubContext(connectedSet.has("github")));
        continue;
      }

      // Composio-backed services with callable actions: the agent gets real
      // tools (see CONNECTOR TOOLS) instead of the "no live reader" note.
      // Tool discovery is dynamic — any connected Composio app works.
      if (
        opts?.connectorTools &&
        connectedSet.has(service) &&
        canResolveConnectorToolkit(service)
      ) {
        const meta = SERVICES.find((item) => item.id === service);
        liveParts.push(
          "CONNECTED CONNECTOR — " +
            (meta?.name ?? service) +
            ": connected and callable. Use a ```connector-tool block to call its actions (see CONNECTOR TOOLS below). " +
            "Never claim it is unavailable or lacks a live reader.",
        );
        continue;
      }

      if (connectedSet.has(service)) {
        const meta = SERVICES.find((item) => item.id === service);
        liveParts.push(
          "CONNECTED CONNECTOR REQUEST — " +
            (meta?.name ?? service) +
            ": this app is connected, but the Tro can't pull its live data directly yet (only Slack and GitHub have live readers). " +
            "Be honest about that limit, offer what you CAN do (draft the message, plan the workflow, prep the content), " +
            "and never claim integrations in general are unavailable.",
        );
      } else {
        const meta = SERVICES.find((item) => item.id === service);
        liveParts.push(
          "CONNECTOR REQUEST — " +
            (meta?.name ?? service) +
            ": this app is not currently connected for the user.",
        );
      }
    } catch (error) {
      liveParts.push(
        "CONNECTOR ERROR — " +
          service +
          ": " +
          (error instanceof Error ? error.message : String(error)) +
          ". The connector is still connected if it appears in CONNECTED APPS; explain the exact access/scope issue instead of saying integrations are unavailable.",
      );
    }
  }

  return {
    connectedNote,
    liveContext: liveParts.length ? "\n\n" + liveParts.join("\n\n") : "",
    requested,
  };
}
