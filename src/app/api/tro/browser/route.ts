import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import {
  browserClick,
  browserNavigate,
  browserScreenshot,
  browserType,
  createBrowserSession,
  endBrowserSession,
  troBrowserConfigured,
  troBrowserSetupHint,
  type TroBrowserSnapshot,
} from "@/lib/tro-browser";

export const runtime = "nodejs";
export const maxDuration = 60;

type ClientSession = {
  sessionId?: string | null;
  connectUrl?: string | null;
  liveUrl?: string | null;
  pageUrl?: string | null;
  title?: string | null;
};

function snapshot(
  row: ClientSession | null,
  extra?: Partial<TroBrowserSnapshot>,
): TroBrowserSnapshot {
  return {
    configured: troBrowserConfigured(),
    sessionId: row?.sessionId ?? null,
    connectUrl: row?.connectUrl ?? null,
    status: row?.sessionId ? "ready" : "idle",
    liveUrl: row?.liveUrl ?? null,
    pageUrl: row?.pageUrl ?? null,
    title: row?.title ?? null,
    error: null,
    screenshotBase64: null,
    ...extra,
  };
}

/** Soft error response — UI reads body.error; avoid opaque HTTP 500 spam. */
function softError(held: ClientSession | null, message: string, http = 200) {
  return NextResponse.json(
    snapshot(held?.sessionId ? held : null, {
      status: "error",
      error: message,
    }),
    { status: http },
  );
}

async function assertAgent(userId: string, agentId: string) {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    userId,
  ]);
  if (!row) throw new Error("Tro not found.");
  return str(row.id);
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const agentId = req.nextUrl.searchParams.get("agentId")?.trim() || "";
    if (!agentId) return NextResponse.json({ error: "agentId required." }, { status: 400 });

    try {
      await assertAgent(user.id, agentId);
    } catch {
      return NextResponse.json({ error: "Tro not found." }, { status: 404 });
    }

    return NextResponse.json(
      snapshot(null, {
        configured: troBrowserConfigured(),
        status: "idle",
        error: troBrowserConfigured() ? null : troBrowserSetupHint(),
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Browser status failed.";
    console.error("tro/browser GET", message);
    return softError(null, message);
  }
}

export async function POST(req: NextRequest) {
  let held: ClientSession = {};
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    let body: {
      agentId?: string;
      action?: string;
      url?: string;
      selector?: string;
      text?: string;
      sessionId?: string | null;
      connectUrl?: string | null;
      liveUrl?: string | null;
      pageUrl?: string | null;
      title?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const agentId = String(body.agentId || "").trim();
    const action = String(body.action || "").trim();
    if (!agentId) return NextResponse.json({ error: "agentId required." }, { status: 400 });

    try {
      await assertAgent(user.id, agentId);
    } catch {
      return NextResponse.json({ error: "Tro not found." }, { status: 404 });
    }

    if (!troBrowserConfigured()) {
      return softError(null, troBrowserSetupHint(), 503);
    }

    held = {
      sessionId: body.sessionId,
      connectUrl: body.connectUrl,
      liveUrl: body.liveUrl,
      pageUrl: body.pageUrl,
      title: body.title,
    };

    if (action === "start") {
      if (held.sessionId && held.connectUrl) {
        return NextResponse.json(snapshot(held, { status: "ready" }));
      }
      const created = await createBrowserSession();
      return NextResponse.json(
        snapshot(
          {
            sessionId: created.sessionId,
            connectUrl: created.connectUrl,
            liveUrl: created.liveUrl,
            pageUrl: null,
            title: null,
          },
          { status: "ready" },
        ),
      );
    }

    if (action === "stop") {
      if (held.sessionId) {
        await endBrowserSession(held.sessionId);
      }
      return NextResponse.json(snapshot(null, { status: "idle" }));
    }

    if (!held.sessionId || !held.connectUrl) {
      return softError(null, "No active computer session. Click Start computer first.", 400);
    }

    if (action === "navigate") {
      const url = String(body.url || "").trim();
      if (!url) return NextResponse.json({ error: "url required." }, { status: 400 });
      const result = await browserNavigate(held.connectUrl, url);
      return NextResponse.json(
        snapshot(
          { ...held, pageUrl: result.pageUrl, title: result.title },
          { status: "ready" },
        ),
      );
    }

    if (action === "screenshot") {
      const result = await browserScreenshot(held.connectUrl);
      return NextResponse.json(
        snapshot(
          { ...held, pageUrl: result.pageUrl, title: result.title },
          { status: "ready", screenshotBase64: result.screenshotBase64 },
        ),
      );
    }

    if (action === "click") {
      const selector = String(body.selector || "").trim();
      if (!selector) return NextResponse.json({ error: "selector required." }, { status: 400 });
      const result = await browserClick(held.connectUrl, selector);
      return NextResponse.json(
        snapshot(
          { ...held, pageUrl: result.pageUrl, title: result.title },
          { status: "ready" },
        ),
      );
    }

    if (action === "type") {
      const selector = String(body.selector || "").trim();
      const text = String(body.text || "");
      if (!selector) return NextResponse.json({ error: "selector required." }, { status: 400 });
      const result = await browserType(held.connectUrl, selector, text);
      return NextResponse.json(
        snapshot(
          { ...held, pageUrl: result.pageUrl, title: result.title },
          { status: "ready" },
        ),
      );
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Browser action failed.";
    console.error("tro/browser POST", message);
    // Prefer JSON body the UI can show over a bare 500 in the network panel.
    return softError(held, message);
  }
}
