import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";

// TEMPORARY DIAGNOSTIC — step 3: auth + db imports.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 3, note: "auth+db imports" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, step: 3, note: "auth+db imports" });
}
