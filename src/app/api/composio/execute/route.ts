import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  composioConfigured,
  createUserSession,
  executeTool,
  resumeSession,
} from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {
 *   tool: "GITHUB_GET_REPOS" | ...
 *   arguments?: object
 *   sessionId?: string  // preferred: execute on session
 * }
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to run tools." }, { status: 401 });
  }

  if (!composioConfigured()) {
    return Response.json(
      { error: "Composio is not configured. Set COMPOSIO_API_KEY." },
      { status: 503 },
    );
  }

  const limit = await consumeRateLimit({
    scope: "composio-execute",
    identity: user.id,
    limit: 60,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many tool calls. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const tool = String(body?.tool || body?.toolSlug || "").trim();
  const args =
    body?.arguments && typeof body.arguments === "object" && !Array.isArray(body.arguments)
      ? (body.arguments as Record<string, unknown>)
      : {};
  const sessionId = String(body?.sessionId || "").trim();

  if (!tool) {
    return Response.json({ error: "Pass tool (Composio tool slug)." }, { status: 400 });
  }

  try {
    if (sessionId) {
      const session = (await resumeSession(sessionId)) as {
        execute?: (
          slug: string,
          arguments_?: Record<string, unknown>,
        ) => Promise<unknown>;
      };
      if (typeof session.execute === "function") {
        const result = await session.execute(tool, args);
        return Response.json({ ok: true, via: "session", result });
      }
    }

    // Ensure the user has a session context even on direct execute
    await createUserSession(user.id).catch(() => null);

    const result = await executeTool(user.id, tool, args);
    return Response.json({ ok: true, via: "tools.execute", result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool execution failed.";
    console.error("[composio] execute", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
