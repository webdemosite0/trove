import "server-only";

import { createHash } from "node:crypto";
import { num, one, run } from "@/lib/db";

type RateLimitInput = {
  scope: string;
  subject: string;
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

let ready: Promise<void> | null = null;

async function ensureTable() {
  if (ready) return ready;
  ready = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key_hash TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    await run(
      `CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset ON rate_limit_buckets (reset_at)`,
    );
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

function digest(scope: string, subject: string) {
  return createHash("sha256")
    .update(`${scope.slice(0, 80)}:${subject.slice(0, 240)}`)
    .digest("hex");
}

/**
 * Durable fixed-window limiter backed by the same libSQL/Turso database as Trove.
 * The database stores only a SHA-256 digest of the identity (never the raw IP/email).
 * Failure is deliberately fail-open so a monitoring/storage blip cannot take Trove down.
 */
export async function takeRateLimit(input: RateLimitInput): Promise<RateLimitDecision> {
  const now = Date.now();
  const limit = Math.max(1, Math.floor(input.limit));
  const windowMs = Math.max(1_000, Math.floor(input.windowMs));
  const nextReset = now + windowMs;

  try {
    await ensureTable();
    const key = digest(input.scope, input.subject);
    const row = await one(
      `INSERT INTO rate_limit_buckets (key_hash, count, reset_at, updated_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(key_hash) DO UPDATE SET
         count = CASE
           WHEN rate_limit_buckets.reset_at <= ? THEN 1
           ELSE rate_limit_buckets.count + 1
         END,
         reset_at = CASE
           WHEN rate_limit_buckets.reset_at <= ? THEN ?
           ELSE rate_limit_buckets.reset_at
         END,
         updated_at = ?
       RETURNING count, reset_at`,
      [key, nextReset, now, now, now, nextReset, now],
    );

    const count = Math.max(1, num(row?.count));
    const resetAt = Math.max(now, num(row?.reset_at) || nextReset);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (error) {
    console.error(
      "rate-limit: check failed",
      error instanceof Error ? error.message : String(error),
    );
    return { allowed: true, remaining: limit, resetAt: nextReset };
  }
}

export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return (forwarded || real || "unknown").slice(0, 120);
}

export async function limitRequest(
  req: Request,
  input: {
    scope: string;
    userId?: string | null;
    anonymousLimit: number;
    authenticatedLimit?: number;
    windowMs: number;
  },
) {
  const authenticated = Boolean(input.userId);
  const subject = authenticated
    ? `user:${input.userId}`
    : `ip:${requestIp(req.headers)}`;

  return takeRateLimit({
    scope: input.scope,
    subject,
    limit: authenticated
      ? input.authenticatedLimit ?? input.anonymousLimit
      : input.anonymousLimit,
    windowMs: input.windowMs,
  });
}

export function rateLimitResponse(decision: RateLimitDecision) {
  const retryAfter = Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000));
  return Response.json(
    {
      error: "Too many requests. Please wait a little and try again.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
