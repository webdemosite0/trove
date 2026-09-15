import { resolveLiveHtml, brandedUnavailablePage, getPublishedBySlug, normalizeSlug } from "@/lib/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public site at {slug}.troveai.site (middleware rewrites → /s/{slug}).
 * Returns raw HTML so the page is not wrapped by the app root layout.
 * SPA deep links also land here via /s/{slug}/[[...path]].
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await ctx.params;
  const slug = normalizeSlug(raw);
  if (!slug || slug.length < 2) {
    return htmlResponse(brandedUnavailablePage(raw || "site", "not_found"), 404);
  }

  const site = await getPublishedBySlug(slug).catch(() => null);
  if (!site) {
    return htmlResponse(brandedUnavailablePage(slug, "not_found"), 404);
  }
  if (site.status !== "published") {
    return htmlResponse(brandedUnavailablePage(slug, "unpublished"), 404);
  }

  const live = await resolveLiveHtml(slug).catch(() => null);
  if (!live?.html) {
    return htmlResponse(brandedUnavailablePage(slug, "not_found"), 404);
  }

  const url = new URL(req.url);
  const isAssetLike = /\.(js|css|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|json|txt)$/i.test(
    url.pathname,
  );

  return htmlResponse(live.html, 200, {
    cache: isAssetLike
      ? "public, max-age=31536000, immutable"
      : "public, s-maxage=30, stale-while-revalidate=120",
  });
}

function htmlResponse(
  body: string,
  status: number,
  opts?: { cache?: string },
) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": opts?.cache || "public, s-maxage=30, stale-while-revalidate=120",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
