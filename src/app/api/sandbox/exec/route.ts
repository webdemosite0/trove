import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Terminal commands now execute in the browser-local project runtime. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Server sandbox execution is retired. Use the Terminal tab in the Sites builder.",
      local: true,
    },
    { status: 410 },
  );
}
