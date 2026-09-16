import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Browser-local runtimes are owned by the page lifecycle; nothing to kill here. */
export async function POST() {
  return NextResponse.json({ ok: true, local: true });
}
