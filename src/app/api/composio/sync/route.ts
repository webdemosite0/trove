import { currentUser } from "@/lib/auth";
import { composioConfigured, syncComposioConnections } from "@/lib/composio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — after Connect Link closes, pull connected toolkits into local DB.
 *
 * Body (optional): { grants?: Record<service, levelId> } — access levels the
 * user picked in the permission modal, recorded on the connection as the
 * stated grant (never sent to the provider).
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!composioConfigured()) {
    return Response.json({ error: "COMPOSIO_API_KEY is not set." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const raw = body?.grants;
  const grants: Record<string, string> | undefined =
    raw && typeof raw === "object"
      ? Object.fromEntries(
          Object.entries(raw)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [String(k).toLowerCase(), String(v)]),
        )
      : undefined;

  try {
    const { synced } = await syncComposioConnections(grants);
    return Response.json({ ok: true, synced });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    console.error("[composio] sync", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
