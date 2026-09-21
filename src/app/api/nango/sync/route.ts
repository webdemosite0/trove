import { syncNangoConnections, nangoEnabled } from "@/lib/nango";
import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to sync services." }, { status: 401 });

  const rate = await consumeRateLimit({
    scope: "nango-sync",
    identity: user.id,
    limit: 60,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Connections are being refreshed too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

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
