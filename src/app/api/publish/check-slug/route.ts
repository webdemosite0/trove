import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { checkSlugAvailability, normalizeSlug } from "@/lib/publish";

export const runtime = "nodejs";

/** GET /api/publish/check-slug?slug=clinilamp&projectId=project_123 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug") || "";
  const projectId = req.nextUrl.searchParams.get("projectId");
  const user = await currentUser().catch(() => null);
  const result = await checkSlugAvailability(raw, user?.id, projectId);
  return NextResponse.json({
    available: result.available,
    slug: result.normalized || normalizeSlug(raw),
    reason: result.reason || null,
  });
}
