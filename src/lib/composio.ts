import "server-only";

import { Composio } from "@composio/core";

/**
 * Composio Platform — unified tool integrations for Trove users.
 *
 * Env: COMPOSIO_API_KEY (project key from dashboard.composio.dev → Platform)
 *
 * Each Trove user maps to a Composio userId (our users.id). Sessions scope
 * which toolkits and connected accounts the agent can use for that user.
 *
 * Current TS API (docs):
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

type SessionLike = {
  sessionId?: string;
  session_id?: string;
  authorize?: (
    toolkit: string,
    opts?: { callbackUrl?: string },
  ) => Promise<{ redirectUrl?: string; redirect_url?: string; url?: string }>;
  execute?: (toolSlug: string, args?: Record<string, unknown>) => Promise<unknown>;
  tools?: () => Promise<unknown>;
  toolkits?: () => Promise<unknown>;
};

function sessionIdOf(session: SessionLike): string {
  return String(session.sessionId || session.session_id || "").trim();
}

/**
 * Create a new session for a Trove user.
 * Prefer reusing a stored sessionId with resumeSession when possible.
 */
export async function createUserSession(
  userId: string,
  opts?: { toolkits?: string[] },
): Promise<ComposioSessionInfo & { session: SessionLike }> {
  const sdk = composio();
  const toolkits = opts?.toolkits?.length ? opts.toolkits : [...DEFAULT_TOOLKITS];

  // Primary API: composio.create(userId, config)
  const anySdk = sdk as Composio & {
    create: (
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

/** Resume an existing session by id (preferred across chat turns). */
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

/**
 * Start OAuth / connect flow for a toolkit.
 * Returns a URL the user opens to authorize the app.
 */
export async function authorizeToolkit(
  session: SessionLike,
  toolkit: string,
  callbackUrl?: string,
): Promise<{ redirectUrl: string }> {
  if (typeof session.authorize !== "function") {
    throw new Error("Session does not support authorize().");
  }
  const result = await session.authorize(
    toolkit,
    callbackUrl ? { callbackUrl } : undefined,
  );
  const redirectUrl =
    result.redirectUrl || result.redirect_url || result.url || "";
  if (!redirectUrl) {
    throw new Error(`Composio did not return a connect URL for ${toolkit}.`);
  }
  return { redirectUrl };
}

/** Execute a tool on a session (required for meta-tools). */
export async function executeOnSession(
  session: SessionLike,
  toolSlug: string,
  args: Record<string, unknown> = {},
) {
  if (typeof session.execute !== "function") {
    throw new Error("Session does not support execute().");
  }
  return session.execute(toolSlug, args);
}

/**
 * Direct tool execute (no session). Fine for tools that do not need
 * tool-router meta tools; prefer executeOnSession in agent flows.
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
