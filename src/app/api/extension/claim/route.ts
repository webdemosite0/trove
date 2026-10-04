import { one, run, uid } from "@/lib/db";
import { hashToken, newToken } from "@/lib/extension";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/extension/claim — the browser extension exchanges a 6-digit
 * pairing code for a long-lived connection token. Code-gated; no session
 * needed (the extension has no cookies). Codes are single-use.
 *
 * Body: { code: "123456", label: "Chrome on MacBook" }
 * Returns: { token } — store it in chrome.storage, never log it.
 */
export async function POST(req: Request) {
  let body: { code?: unknown; label?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Bad JSON." }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const label =
    typeof body.label === "string" ? body.label.slice(0, 80) : "Browser";
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "Invalid code." }, { status: 400 });
  }

  const row = (await one(
    `SELECT code, user_id, expires_at, used FROM extension_pairing_codes WHERE code = ? LIMIT 1`,
    [code],
  )) as
    | { code: string; user_id: string; expires_at: number; used: number }
    | undefined;
  const now = Date.now();
  if (!row || row.used || row.expires_at < now) {
    // Burn the code if it was valid but expired, so it can't be retried.
    if (row) await run(`DELETE FROM extension_pairing_codes WHERE code = ?`, [code]);
    return Response.json({ error: "Code expired or invalid." }, { status: 400 });
  }
  // Single-use: mark burned before issuing the token.
  await run(`UPDATE extension_pairing_codes SET used = 1 WHERE code = ?`, [code]);

  const token = newToken();
  const id = uid("xcon_");
  await run(
    `INSERT INTO extension_connections (id, user_id, token_hash, label, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, row.user_id, hashToken(token), label || "Browser", now, now],
  );
  return Response.json({ token, connectionId: id });
}
