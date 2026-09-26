import { currentUser } from "@/lib/auth";
import {
  composioConfigured,
  createUserSession,
  executeOnSession,
  executeTool,
} from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — prove COMPOSIO_API_KEY works with a tool that needs no user OAuth.
 * Uses HACKERNEWS_GET_USER (username=pg) as documented by Composio.
 *
 * Auth: signed-in user (maps to Composio userId).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!composioConfigured()) {
    return Response.json(
      {
        ok: false,
        configured: false,
        error:
          "COMPOSIO_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 503 },
    );
  }

  try {
    // Prefer session path (same path agents will use).
    const { session, sessionId } = await createUserSession(user.id, {
      toolkits: ["hackernews"],
    });

    let result: unknown;
    let via = "session.execute";
    try {
      result = await executeOnSession(session, "HACKERNEWS_GET_USER", {
        username: "pg",
      });
    } catch {
      // Fallback: direct tools.execute (still proves the project key).
      via = "tools.execute";
      result = await executeTool(user.id, "HACKERNEWS_GET_USER", {
        username: "pg",
      });
    }

    return Response.json({
      ok: true,
      configured: true,
      via,
      sessionId,
      userId: user.id,
      tool: "HACKERNEWS_GET_USER",
      arguments: { username: "pg" },
      result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verify failed.";
    console.error("[composio] verify", message);
    return Response.json(
      {
        ok: false,
        configured: true,
        error: message,
        hint: "Check the project API key (ak_…) and that the Hacker News toolkit is available on your Composio plan.",
      },
      { status: 400 },
    );
  }
}
