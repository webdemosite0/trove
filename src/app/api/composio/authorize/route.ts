import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  authorizeToolkit,
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

  try {
    let session: {
      authorize: (
        t: string,
        opts?: { callbackUrl?: string },
      ) => Promise<{ redirectUrl?: string; redirect_url?: string; url?: string }>;
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
    return Response.json({ error: message }, { status: 400 });
  }
}
