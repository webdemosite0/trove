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

// TEMPORARY DIAGNOSTIC — step 6: full imports, minimal handlers.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 6, note: "full imports, minimal handlers" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 6, note: "full imports, minimal handlers" });
}
