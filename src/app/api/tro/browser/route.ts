import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// TEMPORARY DIAGNOSTIC — minimal route to isolate the production 500.
// Step 1: no lib imports at all.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 1, note: "no lib imports" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 1, note: "no lib imports" });
}
