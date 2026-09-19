import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { secretFor } from "@/lib/connections";
import {
  isSlackToken,
  isSlackWebhook,
  listSlackChannels,
  recentSlackMessages,
  postSlackMessage,
  postSlackWebhook,
} from "@/lib/slack";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let service = "";
  let action = "";
  let channel = "";
  let text = "";
  let limit = 15;
  try {
    const body = await req.json();
    service = String(body?.service ?? "").trim().toLowerCase();
    action = String(body?.action ?? "").trim().toLowerCase();
    channel = String(body?.channel ?? body?.channel_name ?? "").trim();
    text = String(body?.text ?? body?.message ?? "").trim();
    limit = Math.min(50, Math.max(1, Number(body?.limit) || 15));
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (service === "github") return githubAct(action);
  if (service === "slack") return slackAct(action, { channel, text, limit });

  if (service === "figma") {
    return Response.json({
      error:
        "Figma is connected for OAuth context, but file APIs need a Figma token action path.",
      ok: false,
    });
  }

  return Response.json(
    { error: `No automated actions for "${service}" yet.` },
    { status: 400 },
  );
}

async function slackAct(
  action: string,
  opts: { channel: string; text: string; limit: number },
) {
  const secret = await secretFor("slack");
  if (!secret) {
    return Response.json(
      {
        error:
          "Slack is not connected. Open Integrations and connect Slack (bot token xoxb- recommended).",
        ok: false,
      },
      { status: 400 },
    );
  }

  try {
    if (action === "list_channels" || action === "channels") {
      if (!isSlackToken(secret)) {
        return Response.json(
          {
            ok: false,
            error:
              "This Slack connection is a webhook only. Reconnect with a Bot User OAuth Token (xoxb-) that has channels:read.",
          },
          { status: 400 },
        );
      }
      const channels = await listSlackChannels(secret, opts.limit);
      return Response.json({ ok: true, channels });
    }

    if (
      action === "recent_messages" ||
      action === "messages" ||
      action === "history" ||
      action === "read"
    ) {
      if (!isSlackToken(secret)) {
        return Response.json(
          {
            ok: false,
            error:
              "Webhook-only Slack cannot read messages. Reconnect with a Bot User OAuth Token (xoxb-) with channels:history and channels:read, and invite the bot to the channel.",
          },
          { status: 400 },
        );
      }
      if (!opts.channel) {
        return Response.json(
          { ok: false, error: "Pass channel (name like general or #general)." },
          { status: 400 },
        );
      }
      const result = await recentSlackMessages(secret, opts.channel, opts.limit);
      return Response.json({ ok: true, ...result });
    }

    if (action === "post" || action === "send" || action === "message") {
      if (!opts.text) {
        return Response.json({ ok: false, error: "Pass text to post." }, { status: 400 });
      }
      if (isSlackWebhook(secret)) {
        await postSlackWebhook(secret, opts.text);
        return Response.json({ ok: true, posted: true, via: "webhook" });
      }
      if (isSlackToken(secret)) {
        if (!opts.channel) {
          return Response.json(
            { ok: false, error: "Pass channel for bot token posts." },
            { status: 400 },
          );
        }
        await postSlackMessage(secret, opts.channel, opts.text);
        return Response.json({ ok: true, posted: true, via: "api" });
      }
      return Response.json({ ok: false, error: "Unrecognized Slack credential." }, { status: 400 });
    }

    return Response.json(
      {
        ok: false,
        error: "Unknown Slack action. Use list_channels, recent_messages, or post.",
      },
      { status: 400 },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Slack action failed." },
      { status: 400 },
    );
  }
}

async function githubToken(): Promise<string | null> {
  const raw = await secretFor("github");
  if (!raw) return null;
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        nango?: boolean;
        connectionId?: string;
      };
      if (parsed.nango && parsed.connectionId) {
        if (!process.env.NANGO_SECRET_KEY?.trim()) return null;
        return `nango:${parsed.connectionId}`;
      }
    } catch {
      /* fall through */
    }
  }
  return raw.trim();
}

async function githubAct(action: string) {
  const token = await githubToken();
  if (!token) {
    return Response.json(
      {
        error:
          "GitHub is not connected. Connect GitHub under Integrations (token or Nango).",
      },
      { status: 400 },
    );
  }

  if (token.startsWith("nango:")) {
    const connectionId = token.slice("nango:".length);
    const key = process.env.NANGO_SECRET_KEY!.trim();
    const path =
      action === "whoami"
        ? "/user"
        : action === "list_repos" || action === "repos"
          ? "/user/repos?per_page=20&sort=updated"
          : "";
    if (!path) {
      return Response.json({ error: "Unknown GitHub action. Use whoami or list_repos." }, { status: 400 });
    }
    const nangoRes = await fetch(`https://api.nango.dev/proxy${path}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Connection-Id": connectionId,
        "Provider-Config-Key": "github",
        Accept: "application/vnd.github+json",
        "User-Agent": "trove",
      },
    });
    const data = await nangoRes.json().catch(() => null);
    if (!nangoRes.ok) {
      return Response.json({ error: `GitHub/Nango returned ${nangoRes.status}`, detail: data }, { status: 400 });
    }
    return Response.json({ ok: true, data });
  }

  const path =
    action === "whoami"
      ? "https://api.github.com/user"
      : action === "list_repos" || action === "repos"
        ? "https://api.github.com/user/repos?per_page=20&sort=updated"
        : "";
  if (!path) {
    return Response.json({ error: "Unknown GitHub action. Use whoami or list_repos." }, { status: 400 });
  }
  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "trove",
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return Response.json({ error: `GitHub returned ${res.status}`, detail: data }, { status: 400 });
  }
  return Response.json({ ok: true, data });
}
