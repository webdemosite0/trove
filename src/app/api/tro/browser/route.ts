import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import {
  browserBack,
  browserClick,
  browserClickRef,
  browserElements,
  browserKey,
  browserNavigate,
  browserPageText,
  browserScreenshot,
  browserScroll,
  browserType,
  browserTypeRef,
  browserWaitForText,
  createBrowserSession,
  diagnoseBrowser,
  endBrowserSession,
  troBrowserConfigured,
  troBrowserSetupHint,
  type TroBrowserSnapshot,
} from "@/lib/tro-browser";

// TEMPORARY DIAGNOSTIC — step 7: full imports + helpers, minimal handlers.
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
  return NextResponse.json({ ok: true, step: 7, note: "full imports + helpers" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 7, note: "full imports + helpers" });
}
