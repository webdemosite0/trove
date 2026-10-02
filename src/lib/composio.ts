import "server-only";

import { Composio } from "@composio/core";
import { currentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { encrypt, canStoreSecrets, hint } from "@/lib/secrets";

/**
 * Composio Platform — unified tool integrations for Trove users.
 *
 * Env: COMPOSIO_API_KEY (project key from dashboard.composio.dev → Platform)
 *
 * TS API:
 *   const session = await composio.create(userId, config?)
 *   const session = await composio.use(sessionId)
 *   await session.execute(toolSlug, args)
 *   await session.authorize(toolkit)
 */

let client: Composio | null = null;

export function composioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

export function composio(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not set.");
  }
  if (!client) {
    client = new Composio({ apiKey });
  }
  return client;
}

import {
  COMPOSIO_MAP,
  COMPOSIO_REQUIRES_AUTH_CONFIG,
  composioToolkitFor,
  serviceForComposioToolkit,
} from "./composio-map";
export {
  COMPOSIO_MAP,
  COMPOSIO_REQUIRES_AUTH_CONFIG,
  composioToolkitFor,
  serviceForComposioToolkit,
};

export const DEFAULT_TOOLKITS = [
  "gmail",
  "github",
  "slack",
  "notion",
  "googlecalendar",
  "googledrive",
  "linear",
  "figma",
] as const;

export type ComposioSessionInfo = {
  sessionId: string;
  userId: string;
};

/** Loose session shape — SDK types vary across @composio/core versions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SessionLike = any;

function sessionIdOf(session: SessionLike): string {
  if (!session || typeof session !== "object") return "";
  return String(
    (session as { sessionId?: string; session_id?: string }).sessionId ||
      (session as { session_id?: string }).session_id ||
      "",
  ).trim();
}

function filterManagedToolkits(toolkits: string[]): string[] {
  return toolkits
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t) => !COMPOSIO_REQUIRES_AUTH_CONFIG.has(t));
}

export async function createUserSession(
  userId: string,
  opts?: { toolkits?: string[] },
): Promise<ComposioSessionInfo & { session: SessionLike }> {
  const sdk = composio();
  const raw =
    opts?.toolkits?.length ? opts.toolkits : [...DEFAULT_TOOLKITS];
  const toolkits = filterManagedToolkits(raw);

  if (toolkits.length === 0) {
    throw new Error(
      "No toolkits available for this session. Some apps (e.g. X/Twitter) need a custom auth config in the Composio dashboard.",
    );
  }

  const anySdk = sdk as Composio & {
    create?: (
      userId: string,
      config?: { toolkits?: string[]; manageConnections?: boolean },
    ) => Promise<SessionLike>;
    sessions?: {
      create?: (
        userId: string,
        config?: { toolkits?: string[]; manageConnections?: boolean },
      ) => Promise<SessionLike>;
    };
  };

  let session: SessionLike;
  if (typeof anySdk.create === "function") {
    session = await anySdk.create(userId, {
      toolkits,
      manageConnections: true,
    });
  } else if (typeof anySdk.sessions?.create === "function") {
    session = await anySdk.sessions.create(userId, {
      toolkits,
      manageConnections: true,
    });
  } else {
    throw new Error("Composio SDK has no create() session API.");
  }

  const sessionId = sessionIdOf(session);
  if (!sessionId) {
    throw new Error("Composio did not return a session id.");
  }

  return { sessionId, userId, session };
}

export async function resumeSession(sessionId: string): Promise<SessionLike> {
  const sdk = composio();
  const anySdk = sdk as Composio & {
    use?: (id: string) => Promise<SessionLike>;
    sessions?: {
      use?: (id: string) => Promise<SessionLike>;
      get?: (id: string) => Promise<SessionLike>;
    };
  };

  if (typeof anySdk.use === "function") {
    return anySdk.use(sessionId);
  }
  if (typeof anySdk.sessions?.use === "function") {
    return anySdk.sessions.use(sessionId);
  }
  if (typeof anySdk.sessions?.get === "function") {
    return anySdk.sessions.get(sessionId);
  }

  throw new Error("This Composio SDK build cannot resume sessions (missing use()).");
}

export async function authorizeToolkit(
  session: SessionLike,
  toolkit: string,
  callbackUrl?: string,
): Promise<{ redirectUrl: string }> {
  const slug = toolkit.trim().toLowerCase();
  if (COMPOSIO_REQUIRES_AUTH_CONFIG.has(slug)) {
    throw new Error(
      `${slug} needs a custom auth config in the Composio dashboard (Platform → Auth configs). Managed auth is not available for this toolkit.`,
    );
  }
  if (!session || typeof session.authorize !== "function") {
    throw new Error("Session does not support authorize().");
  }
  const result = (await session.authorize(
    toolkit,
    callbackUrl ? { callbackUrl } : undefined,
  )) as {
    redirectUrl?: string | null;
    redirect_url?: string | null;
    url?: string | null;
  };
  const redirectUrl = String(
    result?.redirectUrl || result?.redirect_url || result?.url || "",
  ).trim();
  if (!redirectUrl) {
    throw new Error(`Composio did not return a connect URL for ${toolkit}.`);
  }
  return { redirectUrl };
}

export async function executeOnSession(
  session: SessionLike,
  toolSlug: string,
  args: Record<string, unknown> = {},
) {
  if (!session || typeof session.execute !== "function") {
    throw new Error("Session does not support execute().");
  }
  return session.execute(toolSlug, args);
}

export async function executeTool(
  userId: string,
  toolSlug: string,
  args: Record<string, unknown> = {},
) {
  const sdk = composio();
  return sdk.tools.execute(toolSlug, {
    userId,
    arguments: args,
  });
}

/** Persist a Composio-backed connection in the local connections table. */
export async function markComposioConnection(
  userId: string,
  service: string,
  accountId: string,
): Promise<void> {
  const payload = JSON.stringify({
    composio: true,
    toolkit: composioToolkitFor(service) ?? service,
    accountId,
  });
  const now = Date.now();
  const secret = canStoreSecrets() ? encrypt(payload) : payload;
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
      userId,
      service,
      "composio",
      secret,
      accountId.slice(0, 64),
      canStoreSecrets() ? hint(accountId) : "via Composio",
      now,
    ],
  );
}

/**
 * After the user finishes Connect Link, sync toolkit connection status
 * into the local connections table so Integrations UI shows Installed.
 *
 * Uses DEFAULT_TOOLKITS only — never the full map (some toolkits need
 * custom auth_configs and break session create).
 */
export async function syncComposioConnections(): Promise<{ synced: string[] }> {
  const user = await currentUser();
  if (!user) return { synced: [] };
  if (!composioConfigured()) return { synced: [] };

  const { session } = await createUserSession(user.id, {
    toolkits: [...DEFAULT_TOOLKITS],
  });

  const synced: string[] = [];
  if (!session || typeof session.toolkits !== "function") {
    return { synced };
  }

  const listed = (await session.toolkits()) as {
    items?: Array<{
      slug?: string;
      name?: string;
      connection?: {
        connectedAccount?: { id?: string } | null;
        connected_account?: { id?: string } | null;
      } | null;
    }>;
  };
  const items = listed?.items ?? [];

  for (const item of items) {
    const slug = String(item.slug || item.name || "").toLowerCase();
    if (!slug) continue;
    const conn = item.connection;
    const accountId =
      conn?.connectedAccount?.id ||
      conn?.connected_account?.id ||
      "";
    if (!accountId) continue;

    const service = serviceForComposioToolkit(slug);
    if (!service) continue;

    await markComposioConnection(user.id, service, accountId);
    synced.push(service);
  }

  return { synced };
}

/* ------------------------------------------------------------------ */
/* Live toolkit catalog — the full Composio app directory (4,000+).    */
/* Fetched from the Composio Platform API and cached in memory for     */
/* 24h so the integrations page can browse every connectable app.     */
/* ------------------------------------------------------------------ */

export interface CatalogApp {
  slug: string;
  name: string;
  logo?: string;
  description?: string;
  categories: string[];
  toolsCount?: number;
}

let catalogCache: { at: number; apps: CatalogApp[] } | null = null;
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

export async function listComposioCatalog(): Promise<CatalogApp[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.apps;
  }
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) throw new Error("COMPOSIO_API_KEY is not set.");

  const apps: CatalogApp[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;

  do {
    const url = new URL("https://backend.composio.dev/api/v3/toolkits");
    url.searchParams.set("limit", "100");
    url.searchParams.set("sort_by", "usage");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Composio catalog request failed (${res.status}).`);
    }
    const data: any = await res.json().catch(() => null);
    const items: any[] = Array.isArray(data)
      ? data
      : data?.items ?? data?.toolkits ?? [];

    for (const t of items) {
      const slug = String(t?.slug ?? "").trim();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const meta = t?.meta ?? {};
      const cats = Array.isArray(meta.categories)
        ? meta.categories
            .map((c: any) => String(c?.name ?? c?.slug ?? c ?? "").trim())
            .filter(Boolean)
        : [];
      apps.push({
        slug,
        name: String(t?.name ?? slug),
        logo: meta.logo ?? t?.logo ?? undefined,
        description: meta.description ?? t?.description ?? undefined,
        categories: cats.slice(0, 3),
        toolsCount: meta.tools_count ?? meta.toolsCount ?? undefined,
      });
    }

    cursor =
      data && !Array.isArray(data)
        ? (data.next_cursor ?? data.nextCursor ?? data.cursor ?? null)
        : null;
    pages += 1;
  } while (cursor && pages < 60);

  catalogCache = { at: Date.now(), apps };
  return apps;
}

/* ------------------------------------------------------------------ */
/* Live toolkit tools — the actual callable tools for one Composio     */
/* toolkit (e.g. gmail → GMAIL_SEND_EMAIL). Fetched from the Composio  */
/* Platform API and cached in memory for 24h so per-turn prompt        */
/* building never hammers the API.                                    */
/* ------------------------------------------------------------------ */

export interface ComposioToolDef {
  slug: string;
  name: string;
  description: string;
  requiredParams: string[];
  allParams: string[];
}

const toolkitToolsCache = new Map<string, { at: number; tools: ComposioToolDef[] }>();
const TOOLKIT_TOOLS_TTL_MS = 24 * 60 * 60 * 1000;

function toolDefFrom(raw: unknown): ComposioToolDef | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const slug = String(t.slug ?? t.name ?? "").trim();
  if (!slug) return null;
  const params =
    (t.parameters as Record<string, unknown> | undefined) ??
    (t.input_parameters as Record<string, unknown> | undefined) ??
    (t.inputParameters as Record<string, unknown> | undefined);
  const props =
    params && typeof params === "object"
      ? ((params.properties ?? {}) as Record<string, unknown>)
      : {};
  const required = Array.isArray(params?.required)
    ? (params.required as unknown[]).map((r) => String(r)).filter(Boolean)
    : [];
  return {
    slug,
    name: String(t.display_name ?? t.displayName ?? t.name ?? slug),
    description: String(
      t.description ?? (t.meta as Record<string, unknown> | undefined)?.description ?? "",
    ).trim(),
    requiredParams: required.slice(0, 12),
    allParams: Object.keys(props).slice(0, 24),
  };
}

export async function listToolkitTools(
  toolkitSlug: string,
): Promise<ComposioToolDef[]> {
  const slug = toolkitSlug.trim().toLowerCase();
  if (!slug) return [];
  const cached = toolkitToolsCache.get(slug);
  if (cached && Date.now() - cached.at < TOOLKIT_TOOLS_TTL_MS) {
    return cached.tools;
  }
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) throw new Error("COMPOSIO_API_KEY is not set.");

  const url = new URL("https://backend.composio.dev/api/v3/tools");
  url.searchParams.set("toolkit_slug", slug);
  url.searchParams.set("limit", "100");
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey, accept: "application/json" },
    cache: "no-store",
    // Time-boxed: this runs before the chat starts streaming, so a hung
    // Composio API must fall back to the curated registry, never stall the turn.
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Composio tools request failed (${res.status}).`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json().catch(() => null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(data) ? data : (data?.items ?? []);
  const tools: ComposioToolDef[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const def = toolDefFrom(raw);
    if (!def || seen.has(def.slug.toUpperCase())) continue;
    seen.add(def.slug.toUpperCase());
    tools.push(def);
  }
  toolkitToolsCache.set(slug, { at: Date.now(), tools });
  return tools;
}
