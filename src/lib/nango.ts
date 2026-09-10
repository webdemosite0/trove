import "server-only";

import { currentUser } from "@/lib/auth";
import { run, all, str, num } from "@/lib/db";
import { encrypt, canStoreSecrets, hint } from "@/lib/secrets";

const NANGO_API = "https://api.nango.dev";

/**
 * Trove service id → Nango integration unique key.
 * Create matching integrations in the Nango dashboard (same keys).
 * https://app.nango.dev → Integrations
 */
export const NANGO_MAP: Record<string, string> = {
  gmail: "google-mail",
  "google-calendar": "google-calendar",
  "google-drive": "google-drive",
  outlook: "outlook",
  calendly: "calendly",
  slack: "slack",
  "microsoft-teams": "microsoft-teams",
  zoom: "zoom",
  github: "github",
  gitlab: "gitlab",
  linear: "linear",
  asana: "asana",
  jira: "jira",
  notion: "notion",
  dropbox: "dropbox",
  onedrive: "one-drive",
  confluence: "confluence",
  airtable: "airtable",
  box: "box",
  supabase: "supabase",
  figma: "figma",
  hubspot: "hubspot",
  salesforce: "salesforce",
  stripe: "stripe",
  shopify: "shopify",
  intercom: "intercom",
  zendesk: "zendesk",
};

export function nangoEnabled(): boolean {
  return Boolean(process.env.NANGO_SECRET_KEY?.trim());
}

export function nangoIntegrationFor(service: string): string | null {
  return NANGO_MAP[service] ?? null;
}

export function serviceForNango(integration: string): string | null {
  const entry = Object.entries(NANGO_MAP).find(([, v]) => v === integration);
  return entry?.[0] ?? null;
}

function secretKey(): string | null {
  return process.env.NANGO_SECRET_KEY?.trim() || null;
}

async function nangoFetch(path: string, init?: RequestInit) {
  const key = secretKey();
  if (!key) throw new Error("NANGO_SECRET_KEY is not set.");
  const res = await fetch(`${NANGO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      body?.error?.message ||
      body?.message ||
      `Nango ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Short-lived Connect session for one service.
 * Frontend opens `connect_link` (or uses the token with Nango Connect UI).
 */
export async function createNangoSession(service: string): Promise<{
  token: string;
  connectLink: string;
  integration: string;
  expiresAt?: string;
}> {
  const user = await currentUser();
  if (!user) throw new Error("Sign in to connect services.");

  const integration = nangoIntegrationFor(service);
  if (!integration) {
    throw new Error("This service is not wired to Nango yet.");
  }

  const body = await nangoFetch("/connect/sessions", {
    method: "POST",
    body: JSON.stringify({
      tags: {
        end_user_id: user.id,
        end_user_email: user.email ?? "",
      },
      allowed_integrations: [integration],
    }),
  });

  const data = body?.data ?? body;
  const token = data?.token;
  const connectLink = data?.connect_link ?? data?.connectLink;
  if (!token || !connectLink) {
    throw new Error("Nango did not return a connect session.");
  }

  return {
    token,
    connectLink,
    integration,
    expiresAt: data?.expires_at,
  };
}

/**
 * Pull connections tagged with this user from Nango and mirror them locally
 * so the Integrations page shows Connected.
 */
export async function syncNangoConnections(): Promise<{ synced: string[] }> {
  const user = await currentUser();
  if (!user) return { synced: [] };
  if (!nangoEnabled()) return { synced: [] };

  // List connections; filter by end_user tag client-side for compatibility.
  const body = await nangoFetch("/connections");
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.connections)
      ? body.connections
      : Array.isArray(body?.data)
        ? body.data
        : [];

  const synced: string[] = [];
  const now = Date.now();

  for (const raw of list) {
    const c = raw as Record<string, unknown>;
    const tags = (c.tags ?? c.end_user ?? {}) as Record<string, string>;
    const endUser =
      tags.end_user_id ||
      tags["end_user_id"] ||
      (typeof c.end_user === "object" && c.end_user
        ? String((c.end_user as { id?: string }).id ?? "")
        : "");
    if (endUser && endUser !== user.id) continue;

    const integration = String(
      c.provider_config_key || c.providerConfigKey || c.integration_id || "",
    );
    const service = serviceForNango(integration);
    if (!service) continue;

    const connectionId = String(c.connection_id || c.connectionId || c.id || "");
    if (!connectionId) continue;

    const account = String(
      (c.connection_config as { email?: string } | undefined)?.email ||
        c.account ||
        connectionId.slice(0, 12),
    );

    // Store Nango connection id as the secret reference (not the OAuth token).
    // Real API calls should go through Nango proxy; we never hold provider tokens.
    const payload = JSON.stringify({
      nango: true,
      connectionId,
      integration,
    });

    if (!canStoreSecrets()) {
      // Still record presence without encrypting full payload if secrets off.
      await run(
        `INSERT INTO connections (user_id, service, kind, secret, account, hint, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, service) DO UPDATE SET
           kind = excluded.kind,
           account = excluded.account,
           hint = excluded.hint,
           verified_at = excluded.verified_at`,
        [
          user.id,
          service,
          "nango",
          connectionId,
          account,
          "via Nango",
          now,
        ],
      );
    } else {
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
          "nango",
          encrypt(payload),
          account,
          hint(connectionId),
          now,
        ],
      );
    }
    synced.push(service);
  }

  return { synced };
}

export async function listLocalNangoServices(): Promise<string[]> {
  const user = await currentUser();
  if (!user) return [];
  const rows = await all(
    `SELECT service FROM connections WHERE user_id = ? AND kind = ?`,
    [user.id, "nango"],
  );
  return rows.map((r) => str(r.service));
}
