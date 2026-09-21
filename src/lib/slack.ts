import "server-only";

/**
 * Slack Web API helpers for connected workspaces.
 *
 * Bot tokens (xoxb-) can list channels and read history when the app has
 * channels:read / channels:history (and groups:* for private channels).
 * Incoming webhooks only post and cannot read.
 */

export function isSlackWebhook(secret: string): boolean {
  return /^https:\/\/hooks\.slack\.com\//i.test(secret.trim());
}

export function isSlackToken(secret: string): boolean {
  return /^xox[bpoa]-/i.test(secret.trim());
}

async function slackApi(
  token: string,
  method: string,
  params: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) throw new Error(`Slack ${method}: empty response`);
  return data;
}

export async function listSlackChannels(
  token: string,
  limit = 30,
): Promise<{ id: string; name: string; isPrivate: boolean; isMember: boolean }[]> {
  const data = await slackApi(token, "conversations.list", {
    types: "public_channel,private_channel",
    exclude_archived: "true",
    limit: String(Math.min(200, Math.max(1, limit))),
  });
  if (!data.ok) throw new Error(String(data.error ?? "conversations.list failed"));
  const channels = Array.isArray(data.channels) ? data.channels : [];
  return channels
    .map((c) => {
      const row = c as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        isPrivate: Boolean(row.is_private),
        isMember: Boolean(row.is_member),
      };
    })
    .filter((c) => c.id && c.name);
}

export async function resolveChannelId(
  token: string,
  channel: string,
): Promise<string | null> {
  const raw = channel.trim().replace(/^#/, "");
  if (!raw) return null;
  if (/^[CGD][A-Z0-9]+$/i.test(raw)) return raw;
  const channels = await listSlackChannels(token, 200);
  const hit = channels.find((c) => c.name.toLowerCase() === raw.toLowerCase());
  return hit?.id ?? null;
}

export interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  time: string;
}

export interface SlackIdentity {
  team: string;
  user: string;
  teamId: string;
  userId: string;
  url: string;
}

export async function slackIdentity(token: string): Promise<SlackIdentity> {
  const data = await slackApi(token, "auth.test");
  if (!data.ok) throw new Error(String(data.error ?? "auth.test failed"));
  return {
    team: String(data.team ?? ""),
    user: String(data.user ?? ""),
    teamId: String(data.team_id ?? ""),
    userId: String(data.user_id ?? ""),
    url: String(data.url ?? ""),
  };
}

export interface SlackWorkspaceMessage extends SlackMessage {
  channel: string;
  channelId: string;
}

export async function recentSlackMessagesAcrossChannels(
  token: string,
  opts: { channelLimit?: number; perChannel?: number; totalLimit?: number } = {},
): Promise<{
  messages: SlackWorkspaceMessage[];
  readableChannels: string[];
  skippedChannels: number;
}> {
  const channelLimit = Math.min(20, Math.max(1, opts.channelLimit ?? 10));
  const perChannel = Math.min(10, Math.max(1, opts.perChannel ?? 5));
  const totalLimit = Math.min(50, Math.max(1, opts.totalLimit ?? 24));

  const channels = await listSlackChannels(token, 100);
  const ordered = [
    ...channels.filter((c) => c.isMember),
    ...channels.filter((c) => !c.isMember),
  ].slice(0, channelLimit);

  const messages: SlackWorkspaceMessage[] = [];
  const readableChannels: string[] = [];
  let skippedChannels = 0;

  for (const channel of ordered) {
    try {
      const data = await slackApi(token, "conversations.history", {
        channel: channel.id,
        limit: String(perChannel),
      });
      if (!data.ok) {
        const error = String(data.error ?? "");
        if (
          error === "not_in_channel" ||
          error === "channel_not_found" ||
          error === "missing_scope"
        ) {
          skippedChannels += 1;
          continue;
        }
        throw new Error(error || "conversations.history failed");
      }

      readableChannels.push(channel.name);
      const list = Array.isArray(data.messages) ? data.messages : [];
      for (const item of list) {
        const row = item as Record<string, unknown>;
        const text = String(row.text ?? "").trim();
        if (!text) continue;
        const ts = String(row.ts ?? "");
        const sec = Number(ts.split(".")[0] || 0);
        messages.push({
          channel: channel.name,
          channelId: channel.id,
          user: String(row.username ?? row.user ?? "user"),
          text,
          ts,
          time: sec ? new Date(sec * 1000).toISOString() : "",
        });
      }
    } catch (error) {
      skippedChannels += 1;
      console.warn(
        "[slack] channel history skipped",
        channel.name,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  messages.sort((a, b) => Number(b.ts) - Number(a.ts));

  return {
    messages: messages.slice(0, totalLimit),
    readableChannels,
    skippedChannels,
  };
}

export function formatSlackWorkspaceMessagesForModel(
  messages: SlackWorkspaceMessage[],
  readableChannels: string[],
  skippedChannels = 0,
): string {
  if (!messages.length) {
    return (
      "LIVE SLACK DATA — no recent readable messages were returned. " +
      (readableChannels.length
        ? `Readable channels checked: ${readableChannels.map((c) => `#${c}`).join(", ")}.`
        : "No readable channels were available to this Slack credential.") +
      (skippedChannels ? ` ${skippedChannels} channel(s) could not be read with the current scopes/membership.` : "")
    );
  }

  const lines = messages.map((m) => {
    const when = m.time ? m.time.replace("T", " ").replace(/\.\d+Z$/, " UTC") : m.ts;
    return `- [${when}] #${m.channel} — ${m.user}: ${m.text.replace(/\n/g, " ")}`;
  });

  return (
    `LIVE SLACK DATA — newest recent messages across readable channels (${messages.length}):\n` +
    lines.join("\n") +
    (skippedChannels
      ? `\n${skippedChannels} channel(s) were skipped because the connected Slack credential could not read them.`
      : "")
  );
}

export async function recentSlackMessages(
  token: string,
  channel: string,
  limit = 15,
): Promise<{ channelId: string; channelName: string; messages: SlackMessage[] }> {
  const channelId = (await resolveChannelId(token, channel)) ?? channel.trim();
  if (!channelId) throw new Error("No channel specified.");

  const data = await slackApi(token, "conversations.history", {
    channel: channelId,
    limit: String(Math.min(50, Math.max(1, limit))),
  });
  if (!data.ok) {
    const err = String(data.error ?? "conversations.history failed");
    if (err === "not_in_channel") {
      throw new Error(
        "The Slack bot is not in that channel. Invite the app to the channel, then try again.",
      );
    }
    if (err === "channel_not_found") {
      throw new Error("Channel not found. Use the channel name (e.g. general) or invite the bot.");
    }
    if (err === "missing_scope") {
      throw new Error(
        "Slack token is missing channels:history (and channels:read). Reconnect with those scopes.",
      );
    }
    throw new Error(err);
  }

  let channelName = channel.replace(/^#/, "");
  try {
    const info = await slackApi(token, "conversations.info", { channel: channelId });
    if (info.ok && info.channel && typeof info.channel === "object") {
      const ch = info.channel as Record<string, unknown>;
      if (ch.name) channelName = String(ch.name);
    }
  } catch {
    /* ignore */
  }

  const messages: SlackMessage[] = [];
  const list = Array.isArray(data.messages) ? data.messages : [];
  for (const m of list) {
    const row = m as Record<string, unknown>;
    const text = String(row.text ?? "").trim();
    if (!text) continue;
    const ts = String(row.ts ?? "");
    const sec = Number(ts.split(".")[0] || 0);
    messages.push({
      user: String(row.username ?? row.user ?? "user"),
      text,
      ts,
      time: sec ? new Date(sec * 1000).toISOString() : "",
    });
  }

  return { channelId, channelName, messages };
}

export async function postSlackWebhook(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Slack webhook returned ${res.status}`);
  }
}

export async function postSlackMessage(
  token: string,
  channel: string,
  text: string,
): Promise<void> {
  const channelId = (await resolveChannelId(token, channel)) ?? channel.trim();
  const data = await slackApi(token, "chat.postMessage", {
    channel: channelId,
    text,
  });
  if (!data.ok) throw new Error(String(data.error ?? "chat.postMessage failed"));
}

export function formatSlackMessagesForModel(
  channelName: string,
  messages: SlackMessage[],
): string {
  if (!messages.length) {
    return `Slack #${channelName}: no recent messages returned.`;
  }
  const lines = messages.map((m) => {
    const when = m.time ? m.time.replace("T", " ").replace(/\.\d+Z$/, " UTC") : m.ts;
    return `- [${when}] ${m.user}: ${m.text.replace(/\n/g, " ")}`;
  });
  return (
    `LIVE SLACK DATA — #${channelName} (newest first, ${messages.length} messages):\n` +
    lines.join("\n")
  );
}
