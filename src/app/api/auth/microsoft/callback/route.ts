import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createUser,
  findByEmail,
  markVerified,
  startSession,
} from "@/lib/auth";
import { exchangeCode, microsoftConfigured } from "@/lib/microsoft";
import { site } from "@/lib/site";
import { applyReferralOnSignup } from "@/lib/affiliates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (why: string) =>
  NextResponse.redirect(`${site.url}/login?error=${encodeURIComponent(why)}`);

export async function GET(req: NextRequest) {
  if (!microsoftConfigured()) return fail("microsoft-unconfigured");

  const url = new URL(req.url);
  const denied = url.searchParams.get("error");
  if (denied) return fail("microsoft-cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get("nx_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return fail("microsoft-state");
  }

  const profile = await exchangeCode(code);
  if (!profile) return fail("microsoft-exchange");
  if (!profile.emailVerified) return fail("microsoft-unverified");

  const existing = await findByEmail(profile.email);
  let needOnboarding = true;

  if (existing) {
    if (!existing.emailVerified) await markVerified(existing.id);
    await startSession(existing.id);
    needOnboarding = !existing.onboardingDone;
  } else {
    const created = await createUser(
      profile.email,
      profile.name,
      randomBytes(32).toString("hex"),
      { provider: "microsoft", emailVerified: true },
    );
    await applyReferralOnSignup(created.id).catch(() => undefined);
    await startSession(created.id);
    needOnboarding = true;
  }

  const next = needOnboarding ? "/onboarding" : "/chat?welcome=referral";
  const res = NextResponse.redirect(
    `${site.url}/launching?next=${encodeURIComponent(next)}`,
  );
  res.cookies.delete("nx_oauth_state");
  return res;
}
