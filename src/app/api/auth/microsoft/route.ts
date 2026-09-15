import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeUrl, microsoftConfigured } from "@/lib/microsoft";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!microsoftConfigured()) {
    return NextResponse.redirect(`${site.url}/login?error=microsoft-unconfigured`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));

  res.cookies.set("nx_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return res;
}
