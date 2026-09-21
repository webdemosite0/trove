import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { one, run, num } from "@/lib/db";

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

let ready: Promise<void> | null = null;

async function ensureTable() {
  if (ready) return ready;
  ready = (async () => {
    await run(`
      CREATE TABLE IF NOT EXISTS security_rate_limits (
        key_hash TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      )
    `);
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function requestIdentity(extra = "") {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip =
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  const agent = h.get("user-agent")?.slice(0, 160) || "unknown";
  return digest(`${ip}:${agent}:${extra.toLowerCase().trim()}`);
}

export async function consumeRateLimit(opts: {
  scope: string;
  identity: string;
  limit: number;
  windowMs: number;
  failClosed?: boolean;
}): Promise<LimitResult> {
  const now = Date.now();
  const resetAt = now + Math.max(1_000, opts.windowMs);
  const keyHash = digest(`${opts.scope}:${opts.identity}`);
  const limit = Math.max(1, Math.floor(opts.limit));

  try {
    await ensureTable();
    const row = await one(
      `INSERT INTO security_rate_limits (key_hash, count, reset_at)
       VALUES (?, 1, ?)
       ON CONFLICT(key_hash) DO UPDATE SET
         count = CASE
           WHEN security_rate_limits.reset_at <= ? THEN 1
           ELSE security_rate_limits.count + 1
         END,
         reset_at = CASE
           WHEN security_rate_limits.reset_at <= ? THEN ?
           ELSE security_rate_limits.reset_at
         END
       RETURNING count, reset_at`,
      [keyHash, resetAt, now, now, resetAt],
    );
    const count = num(row?.count);
    const currentReset = num(row?.reset_at) || resetAt;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((currentReset - now) / 1000)),
    };
  } catch (error) {
    // Rate limiting is protective, not a reason to take Trove down if the DB is degraded.
    console.error(
      "rate-limit: check failed",
      error instanceof Error ? error.message : String(error),
    );
    return opts.failClosed
      ? { allowed: false, remaining: 0, retryAfterSeconds: 30 }
      : { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}


export async function expensiveRequestLimit(opts: {
  userId: string;
  scope: string;
  limit?: number;
  windowMs?: number;
}): Promise<Response | null> {
  const limit = opts.limit ?? 40;
  const windowMs = opts.windowMs ?? 10 * 60 * 1000;

  const userResult = await consumeRateLimit({
    scope: `expensive:${opts.scope}:user`,
    identity: opts.userId,
    limit,
    windowMs,
    failClosed: true,
  });

  if (!userResult.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(userResult.retryAfterSeconds) },
      },
    );
  }

  const networkIdentity = await requestIdentity(opts.scope);
  const networkResult = await consumeRateLimit({
    scope: `expensive:${opts.scope}:network`,
    identity: networkIdentity,
    // Allow normal offices / shared networks while still stopping cheap
    // multi-account bursts from one client or bot host.
    limit: Math.max(80, limit * 4),
    windowMs,
    failClosed: true,
  });

  if (networkResult.allowed) return null;

  return Response.json(
    { error: "Too many requests from this network. Please wait and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(networkResult.retryAfterSeconds) },
    },
  );
}
