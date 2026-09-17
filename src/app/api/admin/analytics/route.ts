import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { analyticsSummary } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || 30);
  const summary = await analyticsSummary(Number.isFinite(days) ? days : 30);
  return NextResponse.json(summary, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
