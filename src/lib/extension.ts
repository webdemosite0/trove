import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { one, run, uid } from "@/lib/db";

export interface ExtensionConnection {
  id: string;
  user_id: string;
  label: string;
  created_at: number;
  last_seen_at: number;
}

/** SHA-256 hex of a token. Tokens are stored hashed, never in plaintext. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Generate a cryptographically random 256-bit token, hex-encoded. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** Generate a 6-digit pairing code (may have leading zeros). */
export function newPairingCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Look up the connection for a raw bearer token (from ?token= or the
 * Authorization header). Returns null when unknown. Updates last_seen_at.
 */
export async function connectionForToken(
  token: string | null | undefined,
): Promise<ExtensionConnection | null> {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const row = (await one(
    `SELECT id, user_id, label, created_at, last_seen_at FROM extension_connections WHERE token_hash = ? LIMIT 1`,
    [hashToken(token)],
  )) as ExtensionConnection | undefined;
  if (!row) return null;
  await run(`UPDATE extension_connections SET last_seen_at = ? WHERE id = ?`, [
    Date.now(),
    row.id,
  ]);
  return row;
}

/** The user's most recently seen connection, if any. */
export async function activeConnectionForUser(
  userId: string,
): Promise<ExtensionConnection | null> {
  const row = (await one(
    `SELECT id, user_id, label, created_at, last_seen_at FROM extension_connections WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 1`,
    [userId],
  )) as ExtensionConnection | undefined;
  return row ?? null;
}

/** Extract a bearer token from ?token= or Authorization: Bearer. */
export function bearerToken(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get("token");
  if (q) return q;
  const h = req.headers.get("authorization");
  if (h && h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return null;
}

export function newCommandId(): string {
  return uid("xcmd_");
}

/**
 * Self-healing table check. The MIGRATIONS runner should create these, but
 * if a deploy raced the migration (or it was skipped), the routes call this
 * first so pairing never fails on a missing table.
 */
export async function ensureExtensionTables(): Promise<void> {
  await run(
    `CREATE TABLE IF NOT EXISTS extension_pairing_codes (code TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS extension_connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS extension_commands (id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES extension_connections(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'pending', result TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  );
}
