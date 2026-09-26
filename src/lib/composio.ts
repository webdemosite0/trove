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

/**
 * Trove service id → Composio toolkit slug.
 * Only include toolkits that work with Composio managed auth by default.
 * Toolkits that require custom auth_configs (e.g. twitter) are omitted until
 * you create an auth config in the Composio dashboard and pass it explicitly.
 */
export const COMPOSIO_MAP: Record<string, string> = {
  gmail: "gmail",
  "google-calendar": "googlecalendar",
  "google-drive": "googledrive",
  outlook: "outlook",
  slack: "slack",
  github: "github",
  gitlab: "gitlab",
  linear: "linear",
  notion: "notion",
  jira: "jira",
  asana: "asana",
  trello: "trello",
  clickup: "clickup",
  dropbox: "dropbox",
  onedrive: "one_drive",
  confluence: "confluence",
  airtable: "airtable",
  box: "box",
  figma: "figma",
  hubspot: "hubspot",
  salesforce: "salesforce",
  stripe: "stripe",
  intercom: "intercom",
  zendesk: "zendesk",
  discord: "discord",
  zoom: "zoom",
  "microsoft-teams": "microsoft_teams",
  linkedin: "linkedin",
  // twitter / X requires a custom auth config in Composio — not auto-created
};

/** Toolkits that cannot use managed auth without an auth_config id. */
export const COMPOSIO_REQUIRES_AUTH_CONFIG = new Set(["twitter", "x"]);

export function composioToolkitFor(service: string): string | null {
  return COMPOSIO_MAP[service] ?? null;
}

export function serviceForComposioToolkit(toolkit: string): string | null {
  const t = toolkit.toLowerCase().replace(/_/g, "");
  for (const [service, slug] of Object.entries(COMPOSIO_MAP)) {
    if (slug.toLowerCase().replace(/_/g, "") === t) return service;
  }
  return null;
}

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
