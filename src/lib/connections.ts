import "server-only";

import { one, all, run, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { encrypt, decrypt, hint, canStoreSecrets } from "@/lib/secrets";
import { providerFor } from "@/lib/providers";

export interface Connection {
  service: string;
  kind: string;
  account: string;
  hint: string;
  verifiedAt: number;
  /**
   * Access level id the user picked in the permission modal (e.g. "read-send").
   * A *stated grant*: recorded on the connection, never sent to the provider —
   * OAuth scopes are set by the provider's own approval screen.
   */
  grant?: string;
}

/** Extract the stated grant from a stored connection payload, if any. */
function grantFromPayload(kind: string, secretStored: string): string | undefined {
  if (kind !== "composio") return undefined;
  const payload = canStoreSecrets()
    ? safeDecrypt(secretStored)
    : secretStored;
  if (!payload || !payload.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(payload) as { grant?: unknown };
    return typeof parsed.grant === "string" && parsed.grant ? parsed.grant : undefined;
  } catch {
    return undefined;
  }
}

/** Best-effort decrypt that returns null instead of throwing. */
function safeDecrypt(value: string): string | null {
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

/**
 * Saves a credential only after proving it works.
 */
export async function connectService(
  service: string,
  secret: string,
): Promise<{ ok: boolean; account?: string; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No identity." };

  const value = secret.trim();
  if (!value) return { ok: false, error: "Paste the credential first." };

  const provider = providerFor(service);
  if (provider.kind === "oauth" || !provider.verify) {
    return {
      ok: false,
      error:
        "Connect this app from Plugins with one-click OAuth (Composio), or use a service that accepts a personal token.",
    };
  }

  if (!canStoreSecrets()) {
    return {
      ok: false,
      error:
        "TROVE_SECRET is not set, so credentials cannot be encrypted. Generate one with: openssl rand -base64 32",
    };
  }

  let result;
  try {
    result = await provider.verify(value);
  } catch {
    return { ok: false, error: "Could not reach that service. Try again." };
  }
  if (!result.ok) return { ok: false, error: result.error ?? "That credential was rejected." };

  await run(
    `INSERT INTO connections (user_id, service, kind, secret, account, hint, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, service) DO UPDATE SET
       kind = excluded.kind,
       secret = excluded.secret,
       account = excluded.account,
       hint = excluded.hint,
       verified_at = excluded.verified_at`,
    [
      user.id,
      service,
      provider.kind,
      encrypt(value),
      result.account ?? "",
      hint(value),
      Date.now(),
    ],
  );

  return { ok: true, account: result.account };
}

export async function disconnectService(service: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  await run(`DELETE FROM connections WHERE user_id = ? AND service = ?`, [
    user.id,
    service,
  ]);
}

export async function listConnections(): Promise<Connection[]> {
  const user = await currentUser();
  if (!user) return [];
  return listConnectionsFor(user.id);
}

/**
 * Same as listConnections but for contexts without a session (e.g. the
 * /api/cron/tro-schedules runner), where currentUser() is unavailable.
 */
export async function listConnectionsFor(userId: string): Promise<Connection[]> {
  if (!userId) return [];
  const rows = await all(
    `SELECT service, kind, account, hint, verified_at, secret FROM connections WHERE user_id = ?`,
    [userId],
  );

  return rows.map((r) => ({
    service: str(r.service),
    kind: str(r.kind),
    account: str(r.account),
    hint: str(r.hint),
    verifiedAt: num(r.verified_at),
    grant: grantFromPayload(str(r.kind), str(r.secret)),
  }));
}

/**
 * Decrypted credential for server-side API calls.
 * Composio-backed rows store metadata only — tools run via Composio sessions.
 */
export async function secretFor(service: string): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const row = await one(
    `SELECT secret, kind FROM connections WHERE user_id = ? AND service = ?`,
    [user.id, service],
  );
  if (!row) return null;

  const stored = str(row.secret);
  const kind = str(row.kind);

  // Composio / legacy Nango rows are not usable as raw provider tokens
  if (kind === "composio" || kind === "nango") return null;

  const raw = decrypt(stored);
  if (!raw) return null;

  // Ignore leftover Nango JSON blobs
  if (raw.includes('"nango"') || raw.includes('"composio"')) return null;

  return raw;
}
