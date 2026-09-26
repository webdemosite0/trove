import { currentUser } from "@/lib/auth";
import { composioConfigured, syncComposioConnections } from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — after Connect Link closes, pull connected toolkits into local DB. */
export async function POST() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!composioConfigured()) {
    return Response.json({ error: "COMPOSIO_API_KEY is not set." }, { status: 503 });
  }

  try {
    const { synced } = await syncComposioConnections();
    return Response.json({ ok: true, synced });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    console.error("[composio] sync", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
