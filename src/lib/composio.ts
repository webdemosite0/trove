import "server-only";

import { Composio } from "@composio/core";

/**
 * Composio Platform — unified tool integrations for Trove users.
 *
 * Env: COMPOSIO_API_KEY (project key from dashboard.composio.dev → Platform)
 *
 * Each Trove user maps to a Composio userId (our users.id). Sessions scope
 * which toolkits and connected accounts the agent can use for that user.
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

/** Default toolkits exposed in a Trove chat/agent session. */
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

/**
 * Create a new Tool Router session for a Trove user.
 * Prefer reusing a stored sessionId with resumeSession when possible.
 */
export async function createUserSession(
  userId: string,
  opts?: { toolkits?: string[] },
): Promise<ComposioSessionInfo & { session: Awaited<ReturnType<Composio["sessions"]["create"]>> }> {
  const sdk = composio();
  const toolkits = opts?.toolkits?.length ? opts.toolkits : [...DEFAULT_TOOLKITS];

  // SDK shape: composio.sessions.create(userId, config)
  const session = await sdk.sessions.create(userId, {
    toolkits,
    manageConnections: true,
  });

  const sessionId =
    (session as { sessionId?: string; session_id?: string }).sessionId ||
    (session as { session_id?: string }).session_id ||
    "";

  if (!sessionId) {
    throw new Error("Composio did not return a session id.");
  }

  return { sessionId, userId, session };
}

/** Resume an existing session by id (preferred across chat turns). */
export async function resumeSession(sessionId: string) {
  const sdk = composio();
  // Prefer sessions.use / attach when available
  const anySdk = sdk as Composio & {
    use?: (id: string) => Promise<unknown>;
    sessions: Composio["sessions"] & {
      use?: (id: string) => Promise<unknown>;
      get?: (id: string) => Promise<unknown>;
    };
  };

  if (typeof anySdk.use === "function") {
    return anySdk.use(sessionId);
  }
  if (typeof anySdk.sessions.use === "function") {
    return anySdk.sessions.use(sessionId);
  }
  if (typeof anySdk.sessions.get === "function") {
    return anySdk.sessions.get(sessionId);
  }

  throw new Error("This Composio SDK build cannot resume sessions.");
}

/**
 * Start OAuth / connect flow for a toolkit for the given user session.
 * Returns a URL the user opens to authorize the app.
 */
export async function authorizeToolkit(
  session: {
    authorize: (
      toolkit: string,
    ) => Promise<{ redirectUrl?: string; redirect_url?: string; url?: string }>;
  },
  toolkit: string,
): Promise<{ redirectUrl: string }> {
  const result = await session.authorize(toolkit);
  const redirectUrl =
    result.redirectUrl ||
    result.redirect_url ||
    result.url ||
    "";
  if (!redirectUrl) {
    throw new Error(`Composio did not return a connect URL for ${toolkit}.`);
  }
  return { redirectUrl };
}

/**
 * Execute a Composio tool by slug for a user (direct path).
 * Prefer session.execute when you already hold a session.
 */
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
