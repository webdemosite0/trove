import {
  resolveLiveHtml,
  brandedUnavailablePage,
  getPublishedBySlug,
  normalizeSlug,
  buildPublishHtml,
} from "@/lib/publish";
import type { ProjectFile } from "@/lib/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Published site at /s/{slug} and /s/{slug}/* (SPA deep links).
 * Optional catch-all alone — do NOT also define /s/[slug]/route.ts
 * (Next.js rejects same specificity as [[...path]]).
 * Middleware may rewrite {slug}.troveai.site → /api/site/{slug} instead.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug: raw } = await ctx.params;
  const slug = normalizeSlug(raw);
  if (!slug || slug.length < 2) {
    return html(brandedUnavailablePage(raw || "site", "not_found"), 404);
  }

  const site = await getPublishedBySlug(slug).catch(() => null);
  if (!site) {
    return html(brandedUnavailablePage(slug, "not_found"), 404);
  }
  if (site.status !== "published") {
    return html(brandedUnavailablePage(slug, "unpublished"), 404);
  }

  let live = await resolveLiveHtml(slug).catch(() => null);

  if (live?.html && isViteShell(live.html) && site.filesJson) {
    try {
      const files = JSON.parse(site.filesJson) as ProjectFile[];
      const rebuilt = buildPublishHtml("", files, site.title);
      if (rebuilt && !isViteShell(rebuilt)) {
        live = { html: rebuilt, title: site.title, version: site.version };
      }
    } catch {
      /* keep */
    }
  }

  if (!live?.html?.trim() || isViteShell(live.html)) {
    return html(brandedUnavailablePage(slug, "not_found"), 404);
  }

  return html(live.html, 200);
}

function isViteShell(h: string): boolean {
  return (
    /type=["']module["']/i.test(h) &&
    (/src\/main\.(jsx|tsx|js)/i.test(h) || /\/src\//i.test(h)) &&
    !/<h1|<section|<main|class=["'][^"']*hero/i.test(h)
  );
}

function html(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
