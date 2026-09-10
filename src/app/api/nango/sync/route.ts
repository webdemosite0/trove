import { syncNangoConnections, nangoEnabled } from "@/lib/nango";

export const runtime = "nodejs";

export async function POST() {
  if (!nangoEnabled()) {
    return Response.json({ error: "Nango is not configured." }, { status: 503 });
  }
  try {
    const result = await syncNangoConnections();
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    console.error("nango/sync", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
