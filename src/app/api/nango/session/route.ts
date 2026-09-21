import type { NextRequest } from "next/server";
import { createNangoSession, nangoEnabled, nangoIntegrationFor } from "@/lib/nango";
import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to connect services." }, { status: 401 });

  const rate = await consumeRateLimit({
    scope: "nango-session",
    identity: user.id,
    limit: 30,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many connection attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  if (!nangoEnabled()) {
    return Response.json(
      {
        error:
          "Nango is not configured. Add NANGO_SECRET_KEY in Vercel env (from https://app.nango.dev → Environment Settings → API Keys).",
      },
      { status: 503 },
    );
  }

  let service = "";
  try {
    const body = await req.json();
    service = String(body?.service ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!service || !nangoIntegrationFor(service)) {
    return Response.json(
      { error: "This service is not available through Nango yet." },
      { status: 400 },
    );
  }

  try {
    const session = await createNangoSession(service);
    return Response.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start Nango connect.";
    console.error("nango/session", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
