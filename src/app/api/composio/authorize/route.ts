import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  authorizeToolkit,
  COMPOSIO_REQUIRES_AUTH_CONFIG,
  composioConfigured,
  composioToolkitFor,
  createUserSession,
  resumeSession,
} from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { toolkit: "gmail" | "github" | service id, sessionId?: string }
 * Accepts either a Composio toolkit slug or a Trove service id.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to connect tools." }, { status: 401 });
  }

  if (!composioConfigured()) {
    return Response.json(
      { error: "Composio is not configured. Set COMPOSIO_API_KEY in Vercel." },
      { status: 503 },
    );
  }

  const limit = await consumeRateLimit({
    scope: "composio-authorize",
    identity: user.id,
    limit: 40,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many connect attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const raw = String(body?.toolkit || body?.service || "").trim().toLowerCase();
  const sessionId = String(body?.sessionId || "").trim();

  if (!raw) {
    return Response.json({ error: "Pass toolkit (e.g. gmail, github, slack)." }, { status: 400 });
  }

  // Map Trove service ids → Composio toolkit slugs
  const toolkit = composioToolkitFor(raw) ?? raw.replace(/-/g, "");

  if (COMPOSIO_REQUIRES_AUTH_CONFIG.has(toolkit) || raw === "twitter") {
    return Response.json(
      {
        error:
          "X/Twitter needs a custom auth config in the Composio dashboard (Platform → Auth configs). It cannot use managed OAuth yet. Try Gmail, GitHub, Slack, or Notion instead.",
      },
      { status: 400 },
    );
  }

  if (!composioToolkitFor(raw) && !toolkit) {
    return Response.json(
      { error: `"${raw}" is not available via Composio on Trove yet.` },
      { status: 400 },
    );
  }

  try {
    let session: {
      authorize: (
        t: string,
        opts?: { callbackUrl?: string },
      ) => Promise<{ redirectUrl?: string | null; redirect_url?: string | null; url?: string | null }>;
    };

    if (sessionId) {
      session = (await resumeSession(sessionId)) as typeof session;
    } else {
      const created = await createUserSession(user.id, { toolkits: [toolkit] });
      session = created.session as typeof session;
    }

    if (typeof session.authorize !== "function") {
      return Response.json(
        { error: "Session does not support authorize(). Update @composio/core." },
        { status: 500 },
      );
    }

    const { redirectUrl } = await authorizeToolkit(session, toolkit);
    return Response.json({
      ok: true,
      toolkit,
      service: raw,
      redirectUrl,
      userId: user.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Authorize failed.";
    console.error("[composio] authorize", message);
    // Surface Composio auth_config errors clearly
    if (/auth.?config/i.test(message)) {
      return Response.json(
        {
          error:
            message +
            " Create an auth config for this toolkit in dashboard.composio.dev, or pick an app that supports managed auth (Gmail, GitHub, Slack, Notion).",
        },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
