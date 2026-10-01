import { composioConfigured, listComposioCatalog } from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/catalog
 * Returns the live Composio toolkit directory (4,000+ apps) so the
 * integrations page can browse every connectable app. Cached in memory
 * for 24h inside listComposioCatalog.
 */
export async function GET() {
  if (!composioConfigured()) {
    return Response.json({ configured: false, total: 0, apps: [] });
  }
  try {
    const apps = await listComposioCatalog();
    return Response.json({ configured: true, total: apps.length, apps });
  } catch (e) {
    return Response.json(
      {
        configured: true,
        total: 0,
        apps: [],
        error: e instanceof Error ? e.message : "Catalog unavailable.",
      },
      { status: 502 },
    );
  }
}
