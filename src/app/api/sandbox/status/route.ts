import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: true,
    local: true,
    provider: "browser",
    preview: "http://localhost:5173",
    needsApiKey: false,
  });
}
