import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createUser,
  findByEmail,
  markVerified,
  startSession,
} from "@/lib/auth";
import { appleConfigured, exchangeCode } from "@/lib/apple";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (why: string) =>
  NextResponse.redirect(`${site.url}/login?error=${encodeURIComponent(why)}`);

/**
 * Apple uses response_mode=form_post — handle POST (and GET for misconfig).
 */
async function handle(req: NextRequest) {
  if (!appleConfigured()) return fail("apple-unconfigured");

  let code: string | null = null;
  let state: string | null = null;
  let userJson: string | null = null;
  let denied: string | null = null;

  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    if (form) {
      code = String(form.get("code") || "") || null;
      state = String(form.get("state") || "") || null;
      userJson = form.get("user") ? String(form.get("user")) : null;
      denied = form.get("error") ? String(form.get("error")) : null;
    }
  } else {
    const url = new URL(req.url);
    code = url.searchParams.get("code");
    state = url.searchParams.get("state");
    denied = url.searchParams.get("error");
  }

  if (denied) return fail("apple-cancelled");

  const expected = req.cookies.get("nx_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return fail("apple-state");
  }

  const profile = await exchangeCode(code, userJson);
  if (!profile) return fail("apple-exchange");

  const existing = await findByEmail(profile.email);

  if (existing) {
    if (!existing.emailVerified) await markVerified(existing.id);
    await startSession(existing.id);
  } else {
    const created = await createUser(
      profile.email,
      profile.name,
      randomBytes(32).toString("hex"),
      { provider: "apple", emailVerified: true },
    );
    await startSession(created.id);
  }

  const res = NextResponse.redirect(
    `${site.url}/launching?next=${encodeURIComponent("/chat")}`,
  );
  res.cookies.delete("nx_oauth_state");
  return res;
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
