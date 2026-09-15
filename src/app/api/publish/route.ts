import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  normalizeSlug,
  publishSite,
  unpublishSite,
  getPublishStatusForUser,
  type PublishResult,
} from "@/lib/publish";
import type { ProjectFile } from "@/lib/builder";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/publish
 * Body: { slug, title?, html?, files?, projectId? }
 * Publishes (or updates) a site at {slug}.troveai.site
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "publish").toLowerCase();

    if (action === "unpublish") {
      const slug = normalizeSlug(String(body.slug || ""));
      if (!slug) {
        return NextResponse.json({ error: "Slug required" }, { status: 400 });
      }
      const result = await unpublishSite({ userId: user.id, slug });
      return NextResponse.json(result);
    }

    const slug = String(body.slug || "");
    const title = body.title ? String(body.title) : undefined;
    const html = body.html != null ? String(body.html) : null;
    const files = Array.isArray(body.files) ? (body.files as ProjectFile[]) : null;
    const projectId = body.projectId ? String(body.projectId) : null;

    const result: PublishResult = await publishSite({
      userId: user.id,
      slug,
      title,
      html,
      files,
      projectId,
    });

    return NextResponse.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status || 500;
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/publish?slug=clinilamp
 * Returns publish status for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get("slug");
  const status = await getPublishStatusForUser(user.id, slug);
  return NextResponse.json(status);
}
