import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { one, run, uid, num, str } from "@/lib/db";

const COOKIE = "nx_session";
const SESSION_DAYS = 30;
const TOKEN_HOURS = 24;

function opaqueDigest(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  emailVerified: boolean;
  provider: string;
  onboardingDone: boolean;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: str(row.id),
    email: str(row.email),
    name: str(row.name),
    plan: str(row.plan),
    emailVerified: num(row.email_verified) === 1,
    provider: str(row.provider) || "password",
    onboardingDone: num(row.onboarding_done) === 1,
  };
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  opts: { provider?: string; emailVerified?: boolean } = {},
): Promise<User> {
  const id = uid("usr");
  const provider = opts.provider ?? "password";
  const verified = opts.emailVerified ? 1 : 0;

  await run(
    `INSERT INTO users (id, email, name, password_hash, plan, created_at, email_verified, provider, onboarding_done)
     VALUES (?, ?, ?, ?, 'free', ?, ?, ?, 0)`,
    [id, email.toLowerCase(), name, hashPassword(password), Date.now(), verified, provider],
  ).catch(async () => {
    await run(
      `INSERT INTO users (id, email, name, password_hash, plan, created_at, email_verified, provider)
       VALUES (?, ?, ?, ?, 'free', ?, ?, ?)`,
      [id, email.toLowerCase(), name, hashPassword(password), Date.now(), verified, provider],
    );
  });

  return {
    id,
    email: email.toLowerCase(),
    name,
    plan: "free",
    emailVerified: Boolean(verified),
    provider,
    onboardingDone: false,
  };
}

export async function findByEmail(email: string) {
  const row = await one(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()]);
  if (!row) return undefined;
  return { ...rowToUser(row), password_hash: str(row.password_hash) };
}

export async function setPlan(userId: string, plan: string) {
  await run(`UPDATE users SET plan = ? WHERE id = ?`, [plan, userId]);
}

export async function markVerified(userId: string) {
  await run(`UPDATE users SET email_verified = 1 WHERE id = ?`, [userId]);
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string },
) {
  if (data.name != null) {
    await run(`UPDATE users SET name = ? WHERE id = ?`, [data.name.trim().slice(0, 80), userId]);
  }
}

export async function completeOnboarding(
  userId: string,
  meta?: {
    goal?: string;
    role?: string;
    firstIdea?: string;
    plan?: string;
    paymentMethod?: string;
    businessName?: string;
    businessUrl?: string;
    businessProfileName?: string;
    businessAnalysis?: string;
  },
) {
  const payload = JSON.stringify({
    goal: meta?.goal || "",
    role: meta?.role || "",
    firstIdea: meta?.firstIdea || "",
    preferredPlan: meta?.plan || "free",
    paymentMethod: meta?.paymentMethod || "",
    businessName: meta?.businessName || "",
    businessUrl: meta?.businessUrl || "",
    businessProfileName: meta?.businessProfileName || "",
    businessAnalysis: meta?.businessAnalysis || "",
    at: Date.now(),
  });
  try {
    await run(
      `UPDATE users SET onboarding_done = 1, onboarding_meta = ? WHERE id = ?`,
      [payload, userId],
    );
  } catch {
    await run(`UPDATE users SET onboarding_done = 1 WHERE id = ?`, [userId]);
  }

  // Log paid interest for admin (Pakistan / manual billing)
  if (meta?.plan && meta.plan !== "free") {
    console.info(
      "[billing] paid plan requested",
      JSON.stringify({
        userId,
        preferredPlan: meta.plan,
        paymentMethod: meta.paymentMethod || "later",
      }),
    );
  }
}

export async function issueToken(
  userId: string,
  purpose: string,
  opts?: { ttlMs?: number },
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const ttlMs = Math.max(5 * 60_000, opts?.ttlMs ?? TOKEN_HOURS * 3_600_000);
  await run(`DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?`, [userId, purpose]);
  await run(
    `INSERT INTO auth_tokens (token, user_id, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [opaqueDigest(token), userId, purpose, Date.now() + ttlMs, Date.now()],
  );
  return token;
}

export async function consumeToken(
  token: string,
  purpose: string,
): Promise<{ userId: string } | { error: "unknown" | "expired" }> {
  const digest = opaqueDigest(token);
  const row = await one(
    `SELECT token AS stored_token, user_id, expires_at
       FROM auth_tokens
      WHERE token IN (?, ?) AND purpose = ?
      LIMIT 1`,
    [digest, token, purpose],
  );
  if (!row) return { error: "unknown" };

  await run(`DELETE FROM auth_tokens WHERE token = ?`, [str(row.stored_token)]);

  if (num(row.expires_at) < Date.now()) return { error: "expired" };
  return { userId: str(row.user_id) };
}

export async function lastTokenAt(userId: string, purpose: string): Promise<number> {
  const row = await one(
    `SELECT created_at FROM auth_tokens WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );
  return row ? num(row.created_at) : 0;
}

export async function startSession(
  userId: string,
  opts?: { persistent?: boolean },
) {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;

  await run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [
    opaqueDigest(token),
    userId,
    expires,
  ]);

  const jar = await cookies();
  const persistent = opts?.persistent !== false;
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(persistent ? { maxAge: SESSION_DAYS * 86_400 } : {}),
  });
}

export async function resetPassword(userId: string, password: string) {
  await run(`UPDATE users SET password_hash = ?, provider = 'password' WHERE id = ?`, [
    hashPassword(password),
    userId,
  ]);
  // A password reset is an account-recovery event. Revoke every existing
  // session so a stolen session cannot survive the credential change.
  await run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
  await run(`DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'reset-password'`, [userId]);
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await run(`DELETE FROM sessions WHERE token IN (?, ?)`, [opaqueDigest(token), token]);
    jar.delete(COOKIE);
  }
}

async function readCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const row = await one(
    `SELECT u.id, u.email, u.name, u.plan, u.email_verified, u.provider, u.onboarding_done, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token IN (?, ?)`,
    [opaqueDigest(token), token],
  ).catch(async () =>
    one(
      `SELECT u.id, u.email, u.name, u.plan, u.email_verified, u.provider, s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token IN (?, ?)`,
      [opaqueDigest(token), token],
    ),
  );

  if (!row) return null;
  if (num(row.expires_at) < Date.now()) {
    await run(`DELETE FROM sessions WHERE token IN (?, ?)`, [opaqueDigest(token), token]);
    return null;
  }

  return rowToUser(row);
}

/**
 * Server Components often ask for the current user from the layout, page,
 * recents, reminders and billing during the same render. React request cache
 * turns those duplicate Turso lookups into one authentication query.
 */
export const currentUser = cache(readCurrentUser);

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
