import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import { troBrowserConfigured } from "@/lib/tro-browser";

// TEMPORARY DIAGNOSTIC — step 4: tro-browser import.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 4, note: "tro-browser import" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 4, note: "tro-browser import" });
}
