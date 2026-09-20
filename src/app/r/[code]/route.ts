import { NextResponse, type NextRequest } from "next/server";
import { findReferrerByCode, REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/affiliates";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /r/CODE — store referral cookie and send the visitor to signup.
 * Login/signup then apply the cookie automatically (no manual code field).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const found = await findReferrerByCode(code).catch(() => null);

  const dest = new URL("/signup", site.url);
  if (found) dest.searchParams.set("ref", found.code);

  const res = NextResponse.redirect(dest);
  if (found) {
    res.cookies.set(REF_COOKIE, found.code, {
      path: "/",
      maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false, // client can show "invited" banner
      secure: site.url.startsWith("https"),
    });
  }
  return res;
}
