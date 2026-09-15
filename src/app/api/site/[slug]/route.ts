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
 * Public published site renderer.
 * Middleware rewrites {slug}.troveai.site → /api/site/{slug}
 * so the response is a pure Route Handler (never the Trove app layout).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
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

  // If stored html is a bare Vite shell, rebuild from files so visitors get a real page.
  if (live?.html && isViteShell(live.html) && site.filesJson) {
    try {
      const files = JSON.parse(site.filesJson) as ProjectFile[];
      const rebuilt = buildPublishHtml("", files, site.title);
      if (rebuilt && !isViteShell(rebuilt)) {
        live = { html: rebuilt, title: site.title, version: site.version };
      }
    } catch {
      /* keep original */
    }
  }

  if (!live?.html?.trim()) {
    return html(brandedUnavailablePage(slug, "not_found"), 404);
  }

  // Still a Vite shell with no usable files — show a clear error, not a blank page.
  if (isViteShell(live.html)) {
    return html(
      brandedUnavailablePage(slug, "not_found").replace(
        "No published website was found",
        "This site was published as a Vite shell without a build. Open Trove Sites and click Publish again",
      ),
      404,
    );
  }

  return html(live.html, 200);
}

function isViteShell(html: string): boolean {
  return (
    /type=["']module["']/i.test(html) &&
    (/src\/main\.(jsx|tsx|js)/i.test(html) || /\/src\//i.test(html)) &&
    !/<h1|<section|<main|class=["'][^"']*hero/i.test(html)
  );
}

function html(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": status === 404 ? "noindex" : "index,follow",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
