import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  composioConfigured,
  createUserSession,
  DEFAULT_TOOLKITS,
  resumeSession,
} from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  — health / whether Composio is configured
 * POST — create or resume a session for the signed-in user
 *
 * Body: { sessionId?: string, toolkits?: string[] }
 */
export async function GET() {
  return Response.json({
    configured: composioConfigured(),
    defaultToolkits: DEFAULT_TOOLKITS,
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to connect tools." }, { status: 401 });
  }

  if (!composioConfigured()) {
    return Response.json(
      {
        error:
          "Composio is not configured. Set COMPOSIO_API_KEY from dashboard.composio.dev (Platform project key).",
      },
      { status: 503 },
    );
  }

  const limit = await consumeRateLimit({
    scope: "composio-session",
    identity: user.id,
    limit: 30,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many session requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const existingId = String(body?.sessionId || "").trim();
  const toolkits = Array.isArray(body?.toolkits)
    ? body.toolkits.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
    : undefined;

  try {
    if (existingId) {
      const session = await resumeSession(existingId);
      return Response.json({
        ok: true,
        resumed: true,
        sessionId: existingId,
        userId: user.id,
        session: summarizeSession(session),
      });
    }

    const created = await createUserSession(user.id, { toolkits });
    return Response.json({
      ok: true,
      resumed: false,
      sessionId: created.sessionId,
      userId: user.id,
      session: summarizeSession(created.session),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Composio session failed.";
    console.error("[composio] session", message);
    return Response.json({ error: message }, { status: 400 });
  }
}

function summarizeSession(session: unknown) {
  if (!session || typeof session !== "object") return null;
  const s = session as Record<string, unknown>;
  return {
    sessionId: s.sessionId ?? s.session_id ?? null,
    mcp: s.mcp ?? null,
  };
}
