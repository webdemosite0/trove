import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { analyticsSummary } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const requested = Number(url.searchParams.get("days") || 30);
  const days = Number.isFinite(requested) ? requested : 30;

  try {
    const summary = await analyticsSummary(days);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error(
      "[admin/analytics] summary failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "Analytics are temporarily unavailable." },
      { status: 503 },
    );
  }
}
