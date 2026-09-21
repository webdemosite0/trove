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
import { consumeRateLimit } from "@/lib/rate-limit";
import { classifyOperationalError, opsAlert } from "@/lib/ops-alert";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/publish
 * Body: { slug, title?, html?, files?, projectId }
 *
 * A saved project id is required because a public domain is a permanent claim:
 * one project owns one slug, and that slug cannot later be reassigned.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limit = await consumeRateLimit({
    scope: "publish",
    identity: user.id,
    limit: 30,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many publish requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
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

    const projectId = String(body.projectId || "").trim();
    if (!projectId) {
      return NextResponse.json(
        { error: "This project is still saving. Try Publish again in a moment." },
        { status: 409 },
      );
    }

    const slug = String(body.slug || "");
    const title = body.title ? String(body.title) : undefined;
    const html = body.html != null ? String(body.html) : null;
    const files = Array.isArray(body.files) ? (body.files as ProjectFile[]) : null;

    const result: PublishResult = await publishSite({
      userId: user.id,
      slug,
      title,
      html,
      files,
      projectId,
    });

    await trackEvent({
      event: ANALYTICS_EVENTS.sitePublished,
      userId: user.id,
      path: "/websites",
      properties: {
        hasFiles: Boolean(files?.length),
        hasHtml: Boolean(html),
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    const requestedStatus = Number((e as { status?: number })?.status || 500);
    const status =
      requestedStatus >= 400 && requestedStatus < 500 ? requestedStatus : 500;
    const message = e instanceof Error ? e.message : "Publish failed";

    if (status >= 500) {
      const kind = classifyOperationalError(e);
      console.error("[publish] failed", kind, message);
      await opsAlert("publish_failed", { kind });
      return NextResponse.json(
        { error: "Publish could not finish. Please try again shortly." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: message.slice(0, 240) || "Publish request could not be completed." },
      { status },
    );
  }
}

/** GET /api/publish?slug=clinilamp */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get("slug");
  const status = await getPublishStatusForUser(user.id, slug);
  return NextResponse.json(status);
}
