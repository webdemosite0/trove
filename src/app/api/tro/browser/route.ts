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
  type TroBrowserSnapshot,
} from "@/lib/tro-browser";

export const runtime = "nodejs";
export const maxDuration = 60;

type StoredSession = {
  sessionId: string;
  connectUrl: string;
  liveUrl: string | null;
  pageUrl: string | null;
  title: string | null;
  userId: string;
  agentId: string;
  updatedAt: number;
};

type Registry = Map<string, StoredSession>;

const REG_KEY = "__troveTroBrowserSessions";

function registry(): Registry {
  const g = globalThis as typeof globalThis & Record<string, unknown>;
  if (!g[REG_KEY]) g[REG_KEY] = new Map();
  return g[REG_KEY] as Registry;
}

function key(userId: string, agentId: string) {
  return `${userId}:${agentId}`;
}

function snapshot(
  row: StoredSession | null,
  extra?: Partial<TroBrowserSnapshot>,
): TroBrowserSnapshot {
  return {
    configured: troBrowserConfigured(),
    sessionId: row?.sessionId ?? null,
    status: row ? "ready" : "idle",
    liveUrl: row?.liveUrl ?? null,
    pageUrl: row?.pageUrl ?? null,
    title: row?.title ?? null,
    error: null,
    screenshotBase64: null,
    ...extra,
  };
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
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get("agentId")?.trim() || "";
  if (!agentId) return NextResponse.json({ error: "agentId required." }, { status: 400 });

  try {
    await assertAgent(user.id, agentId);
  } catch {
    return NextResponse.json({ error: "Tro not found." }, { status: 404 });
  }

  const row = registry().get(key(user.id, agentId)) ?? null;
  return NextResponse.json(snapshot(row));
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    agentId?: string;
    action?: string;
    url?: string;
    selector?: string;
    text?: string;
    sessionId?: string;
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
    return NextResponse.json(
      {
        ...snapshot(null, {
          status: "error",
          error:
            "Cloud browser is not configured. Add BROWSERBASE_API_KEY (and optional BROWSERBASE_PROJECT_ID) on Vercel.",
        }),
      },
      { status: 503 },
    );
  }

  const reg = registry();
  const k = key(user.id, agentId);

  try {
    if (action === "start") {
      const existing = reg.get(k);
      if (existing && Date.now() - existing.updatedAt < 25 * 60 * 1000) {
        return NextResponse.json(snapshot(existing, { status: "ready" }));
      }
      if (existing) {
        await endBrowserSession(existing.sessionId);
        reg.delete(k);
      }

      const created = await createBrowserSession();
      const row: StoredSession = {
        sessionId: created.sessionId,
        connectUrl: created.connectUrl,
        liveUrl: created.liveUrl,
        pageUrl: null,
        title: null,
        userId: user.id,
        agentId,
        updatedAt: Date.now(),
      };
      reg.set(k, row);
      return NextResponse.json(snapshot(row, { status: "ready" }));
    }

    if (action === "stop") {
      const existing = reg.get(k);
      if (existing) {
        await endBrowserSession(existing.sessionId);
        reg.delete(k);
      }
      return NextResponse.json(snapshot(null, { status: "idle" }));
    }

    const row = reg.get(k);
    if (!row) {
      return NextResponse.json(
        snapshot(null, {
          status: "error",
          error: "No active computer session. Start the computer first.",
        }),
        { status: 400 },
      );
    }

    if (action === "navigate") {
      const url = String(body.url || "").trim();
      if (!url) return NextResponse.json({ error: "url required." }, { status: 400 });
      const result = await browserNavigate(row.connectUrl, url);
      row.pageUrl = result.pageUrl;
      row.title = result.title;
      row.updatedAt = Date.now();
      reg.set(k, row);
      return NextResponse.json(
        snapshot(row, { status: "ready", pageUrl: result.pageUrl, title: result.title }),
      );
    }

    if (action === "screenshot") {
      const result = await browserScreenshot(row.connectUrl);
      row.pageUrl = result.pageUrl;
      row.title = result.title;
      row.updatedAt = Date.now();
      reg.set(k, row);
      return NextResponse.json(
        snapshot(row, {
          status: "ready",
          pageUrl: result.pageUrl,
          title: result.title,
          screenshotBase64: result.screenshotBase64,
        }),
      );
    }

    if (action === "click") {
      const selector = String(body.selector || "").trim();
      if (!selector) return NextResponse.json({ error: "selector required." }, { status: 400 });
      const result = await browserClick(row.connectUrl, selector);
      row.pageUrl = result.pageUrl;
      row.title = result.title;
      row.updatedAt = Date.now();
      reg.set(k, row);
      return NextResponse.json(snapshot(row, { status: "ready" }));
    }

    if (action === "type") {
      const selector = String(body.selector || "").trim();
      const text = String(body.text || "");
      if (!selector) return NextResponse.json({ error: "selector required." }, { status: 400 });
      const result = await browserType(row.connectUrl, selector, text);
      row.pageUrl = result.pageUrl;
      row.title = result.title;
      row.updatedAt = Date.now();
      reg.set(k, row);
      return NextResponse.json(snapshot(row, { status: "ready" }));
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Browser action failed.";
    console.error("tro/browser", message);
    return NextResponse.json(
      snapshot(reg.get(k) ?? null, { status: "error", error: message }),
      { status: 500 },
    );
  }
}
