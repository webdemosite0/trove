import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// TEMPORARY DIAGNOSTIC — step 5: minimal + maxDuration.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 5, note: "minimal + maxDuration" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 5, note: "minimal + maxDuration" });
}
