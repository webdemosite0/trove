import type { NextRequest } from "next/server";
import { createNangoSession, nangoEnabled, nangoIntegrationFor } from "@/lib/nango";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
