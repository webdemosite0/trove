import { GET as serveSlug } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SPA fallback: clinilamp.troveai.site/about → /s/clinilamp/about
 * Middleware rewrites the host; this catch-all serves the same published HTML
 * so client-side routers can take over. Static asset paths that aren't in the
 * stored bundle still receive index.html (standard SPA behaviour).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug } = await ctx.params;
  return serveSlug(req, { params: Promise.resolve({ slug }) });
}
