import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Compatibility endpoint for older clients.
 * The current Sites builder boots its runtime directly in the browser, so no
 * server-side sandbox URL or API key is required.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      local: true,
      url: "http://localhost:5173",
      message: "Trove preview now runs locally in the browser. Refresh the Sites builder if you still see this endpoint being called.",
    },
    { status: 410 },
  );
}
