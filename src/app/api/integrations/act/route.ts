import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { secretFor } from "@/lib/connections";

export const runtime = "nodejs";

/**
 * Run a small set of real actions against a connected integration.
 * Body: { service: "github", action: "list_repos" | "whoami" }
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let service = "";
  let action = "";
  try {
    const body = await req.json();
    service = String(body?.service ?? "").trim().toLowerCase();
    action = String(body?.action ?? "").trim().toLowerCase();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (service === "github") {
    return githubAct(action);
  }

  if (service === "figma") {
    return Response.json({
      error:
        "Figma is connected for OAuth context, but file APIs need a Figma token action path. Open the file in Figma and paste a share link for now, or use Design tool in Trove.",
      ok: false,
    });
  }

  return Response.json(
    { error: `No automated actions for “${service}” yet. Connect it and use the matching workspace.` },
    { status: 400 },
  );
}

async function githubToken(): Promise<string | null> {
  const raw = await secretFor("github");
  if (!raw) return null;
  // Nango-stored payload is JSON; personal tokens are plain strings.
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { nango?: boolean; connectionId?: string; integration?: string };
      if (parsed.nango && parsed.connectionId) {
        // Prefer Nango proxy if configured
        const key = process.env.NANGO_SECRET_KEY?.trim();
        if (!key) return null;
        // Return a special marker handled below
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
          "GitHub is not connected, or the token cannot be read. Connect GitHub under Integrations (token or Nango).",
      },
      { status: 400 },
    );
  }

  if (token.startsWith("nango:")) {
    const connectionId = token.slice("nango:".length);
    const key = process.env.NANGO_SECRET_KEY!.trim();
    const path =
      action === "whoami" ? "/user" : action === "list_repos" ? "/user/repos?per_page=20&sort=updated" : null;
    if (!path) {
      return Response.json({ error: `Unknown GitHub action: ${action}` }, { status: 400 });
    }
    const res = await fetch(`https://api.nango.dev/proxy${path}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Provider-Config-Key": "github",
        "Connection-Id": connectionId,
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return Response.json(
        { error: data?.message || data?.error || `GitHub via Nango ${res.status}` },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, service: "github", action, data });
  }

  const path =
    action === "whoami"
      ? "https://api.github.com/user"
      : action === "list_repos"
        ? "https://api.github.com/user/repos?per_page=20&sort=updated"
        : null;
  if (!path) {
    return Response.json({ error: `Unknown GitHub action: ${action}` }, { status: 400 });
  }

  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Trove",
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return Response.json(
      { error: data?.message || `GitHub ${res.status}` },
      { status: 502 },
    );
  }
  return Response.json({ ok: true, service: "github", action, data });
}
