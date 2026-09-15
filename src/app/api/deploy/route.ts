import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { publishSite } from "@/lib/publish";
import type { ProjectFile } from "@/lib/builder";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Legacy alias for POST /api/publish — kept so older PublishPanel clients keep working.
 * Prefer /api/publish going forward.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await publishSite({
      userId: user.id,
      slug: String(body.slug || ""),
      title: body.title ? String(body.title) : undefined,
      html: body.html != null ? String(body.html) : null,
      files: Array.isArray(body.files) ? (body.files as ProjectFile[]) : null,
      projectId: body.projectId ? String(body.projectId) : null,
    });
    return NextResponse.json({
      ok: true,
      success: true,
      slug: result.slug,
      url: result.url,
      status: result.status,
      version: result.version,
    });
  } catch (e) {
    const status = (e as { status?: number })?.status || 500;
    const message = e instanceof Error ? e.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status });
  }
}
