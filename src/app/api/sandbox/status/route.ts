import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.E2B_API_KEY?.trim());
  return NextResponse.json({
    configured,
    provider: "e2b",
    preview: "localhost:5173",
    needsApiKey: !configured,
  });
}
