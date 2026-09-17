import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_EVENTS = new Set([
  "page_view",
  "help_opened",
  "builder_opened",
  "publish_clicked",
  "checkout_clicked",
]);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    event?: unknown;
    path?: unknown;
    properties?: Record<string, string | number | boolean | null>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const event = String(body.event || "").trim().toLowerCase();
  if (!CLIENT_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unsupported analytics event." }, { status: 400 });
  }

  await trackEvent({
    event,
    userId: user.id,
    path: typeof body.path === "string" ? body.path : "",
    properties: body.properties && typeof body.properties === "object" ? body.properties : {},
  });

  return NextResponse.json({ ok: true });
}
