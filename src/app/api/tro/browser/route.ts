import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { one, str } from "@/lib/db";

// TEMPORARY DIAGNOSTIC — step 2: db import only.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 2, note: "db import" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 2, note: "db import" });
}
