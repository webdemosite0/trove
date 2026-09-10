#!/usr/bin/env node
/**
 * Top up (recredit) a member by email for the current calendar month.
 *
 * Usage:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/recredit.mjs kallokalia233@gmail.com 5000
 *
 * Or with a local SQLite file:
 *   TROVE_DATA_DIR=./.data node scripts/recredit.mjs kallokalia233@gmail.com 5000
 *
 * Args:
 *   1. email (required)
 *   2. bonus credits to ADD to this month's grant (default: 5000)
 */

import { createClient } from "@libsql/client";
import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const email = (process.argv[2] || "").trim().toLowerCase();
const bonus = Math.max(0, Number(process.argv[3] ?? 5000) || 0);

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/recredit.mjs <email> [bonusCredits]");
  process.exit(1);
}

function period(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function localUrl() {
  const dir = process.env.TROVE_DATA_DIR
    ? path.resolve(process.env.TROVE_DATA_DIR)
    : path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  // Prefer trove.db, fall back to legacy nexora.db name used by the app
  const trove = path.join(dir, "trove.db");
  const nexora = path.join(dir, "nexora.db");
  const file = existsSync(trove) ? trove : nexora;
  return `file:${file.replace(/\\/g, "/")}`;
}

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

const client = createClient(
  url ? { url, authToken } : { url: localUrl() },
);

const p = period();

const userRes = await client.execute({
  sql: `SELECT id, email, name, plan FROM users WHERE lower(email) = ?`,
  args: [email],
});

const user = userRes.rows[0];
if (!user) {
  console.error(`No user found for email: ${email}`);
  process.exit(2);
}

const userId = String(user.id);
const plan = String(user.plan || "free");

// Ensure a grant row exists for this period
await client.execute({
  sql: `INSERT OR IGNORE INTO credit_grants (user_id, period, plan, credits, created_at)
        VALUES (?, ?, ?, ?, ?)`,
  args: [userId, p, plan, 0, Date.now()],
});

const beforeRes = await client.execute({
  sql: `SELECT credits FROM credit_grants WHERE user_id = ? AND period = ?`,
  args: [userId, p],
});
const before = Number(beforeRes.rows[0]?.credits ?? 0);
const after = before + bonus;

await client.execute({
  sql: `UPDATE credit_grants SET credits = ?, plan = ? WHERE user_id = ? AND period = ?`,
  args: [after, plan, userId, p],
});

const spendRes = await client.execute({
  sql: `SELECT COALESCE(SUM(credits), 0) AS used FROM credit_spends WHERE user_id = ? AND period = ?`,
  args: [userId, p],
});
const used = Number(spendRes.rows[0]?.used ?? 0);

console.log(
  JSON.stringify(
    {
      ok: true,
      email: String(user.email),
      name: String(user.name),
      userId,
      plan,
      period: p,
      grantedBefore: before,
      bonusAdded: bonus,
      grantedAfter: after,
      usedThisPeriod: used,
      remaining: Math.max(0, after - used),
    },
    null,
    2,
  ),
);

process.exit(0);
