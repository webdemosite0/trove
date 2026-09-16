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
 * Published site renderer used by both /s/{slug} and wildcard subdomains.
 * Middleware rewrites {slug}.troveai.site/<path> → /s/{slug}/<path>.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug: raw, path = [] } = await ctx.params;
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

  const files = parseFiles(site.filesJson);
  const requestedPath = cleanRequestedPath(path);

  // Real files take precedence over the SPA fallback. This lets published sites
  // serve stylesheets, scripts, favicons and other text assets from the same host.
  if (requestedPath) {
    const asset = findPublishedFile(files, requestedPath);
    if (asset) return fileResponse(asset.path, asset.content);
  }

  let live = await resolveLiveHtml(slug).catch(() => null);

  if (live?.html && isViteShell(live.html) && files.length) {
    const rebuilt = buildPublishHtml("", files, site.title);
    if (rebuilt && !isViteShell(rebuilt)) {
      live = { html: rebuilt, title: site.title, version: site.version };
    }
  }

  if (!live?.html?.trim() || isViteShell(live.html)) {
    return html(brandedUnavailablePage(slug, "not_found"), 404);
  }

  // Unknown paths are treated as SPA deep links and receive the app shell.
  return html(live.html, 200);
}

function parseFiles(raw: string | null): ProjectFile[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((file) => file && typeof file.path === "string")
      .map((file) => ({
        path: String(file.path).replace(/^\/+/, ""),
        content: String(file.content ?? ""),
      }));
  } catch {
    return [];
  }
}

function cleanRequestedPath(path: string[]): string {
  return path
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .join("/")
    .replace(/^\/+/, "");
}

function findPublishedFile(files: ProjectFile[], requestedPath: string): ProjectFile | null {
  const candidates = new Set([
    requestedPath,
    decodeURIComponentSafe(requestedPath),
    `public/${requestedPath}`,
    `public/${decodeURIComponentSafe(requestedPath)}`,
  ]);

  for (const file of files) {
    const path = file.path.replace(/^\/+/, "");
    if (candidates.has(path)) return file;
  }
  return null;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isViteShell(h: string): boolean {
  return (
    /type=["']module["']/i.test(h) &&
    (/src\/main\.(jsx|tsx|js)/i.test(h) || /\/src\//i.test(h)) &&
    !/<h1|<section|<main|class=["'][^"']*hero/i.test(h)
  );
}

function fileResponse(path: string, body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType(path),
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function contentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (lower.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
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
