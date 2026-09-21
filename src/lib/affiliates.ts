import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { all, one, run, uid, num, str } from "@/lib/db";
import { grantBonusCredits } from "@/lib/credits";
import { site } from "@/lib/site";
import { PAID_REFERRAL_QUALIFY_DAYS } from "@/lib/affiliates-public";

/** Cookie set when someone opens a referral link. */
export const REF_COOKIE = "trove_ref";
export const REF_COOKIE_DAYS = 30;

/** Credits the referrer earns when a referred user signs up. */
export const REFERRER_SIGNUP_CREDITS = 75;

/** Credits the new user gets when they join via a referral link. */
export const INVITEE_SIGNUP_CREDITS = 40;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 8): string {
  let out = "";
  const bytes = randomBytes(len);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

/** Create affiliate tables if a deploy has not run the latest schema migrations yet. */
async function ensureAffiliateTables(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS affiliate_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS affiliate_codes_code ON affiliate_codes (code)`).catch(() => undefined);
  await run(`CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'credited',
    credits_referrer INTEGER NOT NULL DEFAULT 0,
    credits_referee INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`);
  await run(`CREATE INDEX IF NOT EXISTS referrals_by_referrer ON referrals (referrer_id, created_at DESC)`).catch(() => undefined);
  await run(`ALTER TABLE users ADD COLUMN referred_by TEXT NOT NULL DEFAULT ''`).catch(() => undefined);
}

/** Ensure the user has a permanent affiliate code. */
export async function ensureAffiliateCode(userId: string): Promise<string> {
  await ensureAffiliateTables();
  const existing = await one(
    `SELECT code FROM affiliate_codes WHERE user_id = ?`,
    [userId],
  );
  if (existing?.code) return str(existing.code);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(8);
    try {
      await run(
        `INSERT INTO affiliate_codes (user_id, code, created_at) VALUES (?, ?, ?)`,
        [userId, code, Date.now()],
      );
      return code;
    } catch {
      /* unique collision — retry */
    }
  }
  const fallback = `T${userId.replace(/\W/g, "").slice(-7).toUpperCase()}`;
  await run(
    `INSERT OR IGNORE INTO affiliate_codes (user_id, code, created_at) VALUES (?, ?, ?)`,
    [userId, fallback, Date.now()],
  );
  const row = await one(`SELECT code FROM affiliate_codes WHERE user_id = ?`, [userId]);
  return str(row?.code) || fallback;
}

export function referralUrl(code: string): string {
  return `${site.url}/r/${encodeURIComponent(code)}`;
}

export async function findReferrerByCode(code: string): Promise<{ userId: string; code: string } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized.length < 4) return null;
  await ensureAffiliateTables();
  const row = await one(
    `SELECT user_id, code FROM affiliate_codes WHERE upper(code) = ?`,
    [normalized],
  );
  if (!row) return null;
  return { userId: str(row.user_id), code: str(row.code) };
}

/** Read referral code from the request cookie (server). */
export async function readRefCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    const v = jar.get(REF_COOKIE)?.value?.trim().toUpperCase();
    return v || null;
  } catch {
    return null;
  }
}

/**
 * Attach a new user to a referrer and grant both sides credits.
 * Safe to call once per referee — duplicate inserts are ignored.
 */
export async function applyReferralOnSignup(
  refereeId: string,
  codeFromForm?: string | null,
): Promise<{ applied: boolean; code?: string }> {
  await ensureAffiliateTables();
  const cookieCode = await readRefCookie();
  const raw = (codeFromForm || cookieCode || "").trim().toUpperCase();
  if (!raw) return { applied: false };

  const referrer = await findReferrerByCode(raw);
  if (!referrer) return { applied: false };
  if (referrer.userId === refereeId) return { applied: false };

  const prior = await one(`SELECT id FROM referrals WHERE referee_id = ?`, [refereeId]);
  if (prior) return { applied: false };

  const id = uid("ref");
  try {
    await run(
      `INSERT INTO referrals (id, referrer_id, referee_id, code, status, credits_referrer, credits_referee, created_at)
       VALUES (?, ?, ?, ?, 'credited', ?, ?, ?)`,
      [
        id,
        referrer.userId,
        refereeId,
        referrer.code,
        REFERRER_SIGNUP_CREDITS,
        INVITEE_SIGNUP_CREDITS,
        Date.now(),
      ],
    );
  } catch {
    return { applied: false };
  }

  await run(`UPDATE users SET referred_by = ? WHERE id = ?`, [referrer.userId, refereeId]).catch(
    () => undefined,
  );

  const refPlan = await one(`SELECT plan FROM users WHERE id = ?`, [referrer.userId]);
  const newPlan = await one(`SELECT plan FROM users WHERE id = ?`, [refereeId]);
  await grantBonusCredits(referrer.userId, str(refPlan?.plan) || "free", REFERRER_SIGNUP_CREDITS);
  await grantBonusCredits(refereeId, str(newPlan?.plan) || "free", INVITEE_SIGNUP_CREDITS);

  return { applied: true, code: referrer.code };
}

export interface AffiliateStats {
  code: string;
  link: string;
  signups: number;
  paidSignups: number;
  creditsEarned: number;
  cashUnlocked: boolean;
  recent: { email: string; name: string; at: number; credits: number; paid: boolean }[];
}

export async function affiliateStatsFor(userId: string): Promise<AffiliateStats> {
  const code = await ensureAffiliateCode(userId);
  const rows = await all(
    `SELECT r.credits_referrer AS credits, r.created_at AS at,
            u.email AS email, u.name AS name, u.plan AS plan
       FROM referrals r
       JOIN users u ON u.id = r.referee_id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50`,
    [userId],
  );

  const recent = rows.map((r) => ({
    email: str(r.email),
    name: str(r.name),
    at: num(r.at),
    credits: num(r.credits),
    paid: str(r.plan) !== "free" && Boolean(str(r.plan)),
  }));

  const totals = await one(
    `SELECT COUNT(*) AS n, COALESCE(SUM(credits_referrer), 0) AS credits
       FROM referrals WHERE referrer_id = ?`,
    [userId],
  );

  const qualifiedBefore = Date.now() - PAID_REFERRAL_QUALIFY_DAYS * 24 * 60 * 60 * 1000;
  const paidRow = await one(
    `SELECT COUNT(*) AS n
       FROM referrals r
       JOIN users u ON u.id = r.referee_id
      WHERE r.referrer_id = ?
        AND r.created_at <= ?
        AND u.plan IN ('pro', 'team')
        AND lower(COALESCE(u.subscription_status, '')) IN ('active', 'trialing', 'on_trial')`,
    [userId, qualifiedBefore],
  );

  const paidSignups = num(paidRow?.n);

  return {
    code,
    link: referralUrl(code),
    signups: num(totals?.n),
    paidSignups,
    creditsEarned: num(totals?.credits),
    cashUnlocked: paidSignups >= 100,
    recent,
  };
}
