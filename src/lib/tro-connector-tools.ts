// Connector tools for Tros (server-only).
//
// When a user @mentions a connected integration in a Tro chat, the Tro gets
// real, callable actions for that integration for the turn. The Tro emits
// ```connector-tool blocks (see src/lib/tool-block.ts); the chat client
// executes them through /api/tro/tools, which runs them here.
//
// Execution goes through Composio: connection rows with kind "composio" store
// metadata only (no usable OAuth token), and Composio's sessions resolve the
// user's connected account server-side. This is the same path as
// /api/composio/execute — proven working.

import "server-only";

import {
  composioConfigured,
  createUserSession,
  executeOnSession,
  executeTool,
} from "@/lib/composio";
import { all, str } from "@/lib/db";
import { SERVICES } from "@/lib/services";

export interface ConnectorActionDef {
  /** Composio tool slug, e.g. GMAIL_FETCH_EMAILS. */
  tool: string;
  /** One-line description shown to the model. */
  description: string;
  /** Example args JSON shown to the model. */
  argHint: string;
  /** Defaults merged under model-provided args. */
  defaults?: Record<string, unknown>;
  /** Hard cap applied to numeric `max_results`-style args. */
  maxResults?: number;
}

export interface ConnectorServiceDef {
  label: string;
  /** Composio toolkit slug for session creation. */
  toolkit: string;
  actions: Record<string, ConnectorActionDef>;
}

/**
 * Registry of callable connector actions per Trove service id.
 *
 * Gmail slugs verified against Composio docs (GMAIL_FETCH_EMAILS defaults
 * max_results to 1 — always pass/merge a default; FETCH_EMAILS returns
 * metadata only, hydrate via GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID).
 * Slack / Drive / Calendar / GitHub slugs follow the same TOOLKIT_ACTION
 * pattern; extend with more read-only actions as needed.
 */
export const TRO_CONNECTOR_ACTIONS: Record<string, ConnectorServiceDef> = {
  gmail: {
    label: "Gmail",
    toolkit: "gmail",
    actions: {
      list_messages: {
        tool: "GMAIL_FETCH_EMAILS",
        description:
          "List/search emails in the inbox. Returns message id, thread id, subject, sender, date and snippet (no full bodies).",
        argHint: `{"query": "is:unread newer_than:7d", "max_results": 10}`,
        defaults: { max_results: 10 },
        maxResults: 25,
      },
      read_message: {
        tool: "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
        description:
          "Read the full body of one email. Get the message id from list_messages first — never invent ids.",
        argHint: `{"message_id": "<id from list_messages>"}`,
      },
    },
  },
  slack: {
    label: "Slack",
    toolkit: "slack",
    actions: {
      list_channels: {
        tool: "SLACK_LIST_CHANNELS",
        description: "List channels in the workspace.",
        argHint: `{"limit": 50}`,
        defaults: { limit: 50 },
      },
      search_messages: {
        tool: "SLACK_SEARCH_MESSAGES",
        description: "Search messages across the workspace.",
        argHint: `{"query": "from:@alice deploy", "count": 20}`,
        defaults: { count: 20 },
        maxResults: 30,
      },
    },
  },
  "google-drive": {
    label: "Google Drive",
    toolkit: "googledrive",
    actions: {
      find_file: {
        tool: "GOOGLEDRIVE_FIND_FILE",
        description:
          "Search Drive files. Supports full Drive query syntax, e.g. name contains 'Q3' or 'me' in owners.",
        argHint: `{"q": "name contains 'report' and mimeType = 'application/pdf'"}`,
      },
      get_file: {
        tool: "GOOGLEDRIVE_GET_FILE_METADATA",
        description: "Get metadata for one file by id (from find_file).",
        argHint: `{"file_id": "<id from find_file>"}`,
      },
    },
  },
  "google-calendar": {
    label: "Google Calendar",
    toolkit: "googlecalendar",
    actions: {
      find_event: {
        tool: "GOOGLECALENDAR_FIND_EVENT",
        description: "Find events in a time range. Times are RFC3339, e.g. 2026-10-03T00:00:00Z.",
        argHint: `{"calendar_id": "primary", "time_min": "2026-10-03T00:00:00Z", "time_max": "2026-10-10T00:00:00Z"}`,
      },
      find_free_slots: {
        tool: "GOOGLECALENDAR_FIND_FREE_SLOTS",
        description: "Find free time slots in a range.",
        argHint: `{"calendar_id": "primary", "time_min": "2026-10-03T09:00:00Z", "time_max": "2026-10-03T17:00:00Z"}`,
      },
    },
  },
  github: {
    label: "GitHub",
    toolkit: "github",
    actions: {
      list_repos: {
        tool: "GITHUB_GET_REPOS",
        description: "List the user's repositories.",
        argHint: `{}`,
      },
    },
  },
};

export function connectorServiceDef(service: string): ConnectorServiceDef | null {
  return TRO_CONNECTOR_ACTIONS[service.toLowerCase()] ?? null;
}

async function connectedServices(userId: string): Promise<Set<string>> {
  try {
    const rows = await all(
      `SELECT service FROM connections WHERE user_id = ?`,
      [userId],
    );
    return new Set(rows.map((r) => str(r.service).toLowerCase()));
  } catch {
    return new Set();
  }
}

/**
 * Build the CONNECTOR TOOLS prompt section for the services the user
 * @mentioned this turn. Only includes services that are connected AND have
 * registered actions. Returns "" when there is nothing callable.
 */
export async function buildTroConnectorToolSection(
  userId: string,
  requestedServices: string[],
): Promise<string> {
  const connected = await connectedServices(userId);
  const usable = requestedServices
    .map((s) => s.toLowerCase())
    .filter((s) => connected.has(s) && connectorServiceDef(s));

  if (!usable.length) return "";

  const blocks = usable.map((service) => {
    const def = connectorServiceDef(service)!;
    const meta = SERVICES.find((s) => s.id === service);
    const label = meta?.name ?? def.label;
    const actions = Object.entries(def.actions)
      .map(
        ([name, a]) =>
          `- ${service}.${name} — ${a.description}\n  args example: ${a.argHint}`,
      )
      .join("\n");
    return `### ${label} (@${service})\n${actions}`;
  });

  return `
CONNECTOR TOOLS — LIVE INTEGRATION ACTIONS
The user @mentioned these connected integrations: ${usable.map((s) => "@" + s).join(", ")}. You can call their real APIs right now with a fenced block — this is how you read live data instead of saying you can't.

To call a tool, put exactly one block per call at the end of your reply (or after a short line like "Checking your inbox…"):

\`\`\`connector-tool
{"service": "gmail", "action": "list_messages", "args": {"query": "is:unread", "max_results": 5}}
\`\`\`

Available actions:
${blocks.join("\n\n")}

Rules:
- Max 3 calls per round. The results come back to you in this same turn and you answer from them.
- Only call actions listed above, only for the @mentioned services. Never call anything else.
- "args" must be a JSON object. For Gmail, always list_messages before read_message — never invent message ids.
- These blocks are stripped before the user sees your reply, so narrate briefly, then answer from the results.
- If a call fails, say what happened plainly and suggest the fix (e.g. reconnect the app) — never claim the integration is unavailable when it is connected.
`;
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

const MAX_ARGS_CHARS = 4096;
const MAX_RESULT_CHARS = 15000;

function sanitizeArgs(
  raw: unknown,
  def: ConnectorActionDef,
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "args must be a JSON object." };
  }
  const json = JSON.stringify(raw);
  if (json.length > MAX_ARGS_CHARS) {
    return { ok: false, error: "args too large." };
  }
  const args: Record<string, unknown> = { ...(def.defaults ?? {}) };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) continue;
    args[k] = v;
  }
  // Bound result-size args so one call can't flood the context.
  if (def.maxResults) {
    for (const key of ["max_results", "maxResults", "count", "limit"]) {
      const n = Number(args[key]);
      if (Number.isFinite(n)) {
        args[key] = Math.max(1, Math.min(def.maxResults, Math.floor(n)));
      }
    }
  }
  return { ok: true, args };
}

function asJsonString(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Pull the first array found at common message-list locations. */
function findMessageArray(node: unknown): Record<string, unknown>[] | null {
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  for (const key of ["messages", "items", "emails"]) {
    const v = o[key];
    if (Array.isArray(v) && v.length && typeof v[0] === "object") {
      return v as Record<string, unknown>[];
    }
  }
  const data = o["data"];
  if (data && typeof data === "object") {
    const found = findMessageArray(data);
    if (found) return found;
  }
  return null;
}

function headerOf(payload: unknown, name: string): string {
  if (!payload || typeof payload !== "object") return "";
  const headers = (payload as Record<string, unknown>)["headers"];
  if (!Array.isArray(headers)) return "";
  const hit = headers.find(
    (h) =>
      h &&
      typeof h === "object" &&
      String((h as Record<string, unknown>)["name"] ?? "").toLowerCase() ===
        name.toLowerCase(),
  ) as Record<string, unknown> | undefined;
  return String(hit?.["value"] ?? "");
}

function pick(...values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** Compact a Gmail list result to id/subject/from/date/snippet rows. @internal */
export function summarizeGmailList(result: unknown): string {
  const arr = findMessageArray(result);
  if (!arr) return asJsonString(result).slice(0, MAX_RESULT_CHARS);
  const rows = arr.slice(0, 25).map((m) => {
    const payload = (m["payload"] ?? {}) as Record<string, unknown>;
    return {
      id: pick(m["id"], m["messageId"], m["message_id"]),
      threadId: pick(m["threadId"], m["thread_id"]),
      subject: pick(m["subject"], headerOf(payload, "subject")),
      from: pick(m["from"], m["sender"], headerOf(payload, "from")),
      date: pick(m["date"], m["internalDate"], headerOf(payload, "date")),
      snippet: pick(m["snippet"]).slice(0, 220),
    };
  });
  return JSON.stringify(rows).slice(0, MAX_RESULT_CHARS);
}

function decodeBase64Url(data: string): string {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractPlainBody(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  const mime = String(p["mimeType"] ?? "");
  const body = (p["body"] ?? {}) as Record<string, unknown>;
  const data = String(body["data"] ?? "");
  if (mime.startsWith("text/plain") && data) {
    return decodeBase64Url(data);
  }
  const parts = p["parts"];
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const text = extractPlainBody(part);
      if (text.trim()) return text;
    }
    // Fallback: first part with any body data (often text/html).
    for (const part of parts) {
      const pb = ((part as Record<string, unknown>)["body"] ?? {}) as Record<string, unknown>;
      const pd = String(pb["data"] ?? "");
      if (pd) {
        return decodeBase64Url(pd)
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ");
      }
    }
  }
  return "";
}

/** Compact a single Gmail message to subject/from/date/body. @internal */
export function summarizeGmailRead(result: unknown): string {
  const root = (
    result && typeof result === "object" && "data" in (result as Record<string, unknown>)
      ? ((result as Record<string, unknown>)["data"] as unknown)
      : result
  ) as Record<string, unknown> | null;
  if (!root || typeof root !== "object") {
    return asJsonString(result).slice(0, MAX_RESULT_CHARS);
  }
  const payload = (root["payload"] ?? {}) as Record<string, unknown>;
  const body =
    extractPlainBody(payload) ||
    pick(root["snippet"], root["body"]).slice(0, 6000);
  const out = {
    id: pick(root["id"], root["messageId"]),
    threadId: pick(root["threadId"]),
    subject: pick(headerOf(payload, "subject"), root["subject"]),
    from: pick(headerOf(payload, "from"), root["from"]),
    date: pick(headerOf(payload, "date"), root["date"]),
    body: body.slice(0, 8000),
  };
  if (!out.subject && !out.body) {
    return asJsonString(result).slice(0, MAX_RESULT_CHARS);
  }
  return JSON.stringify(out).slice(0, MAX_RESULT_CHARS);
}

function summarizeResult(service: string, action: string, result: unknown): string {
  try {
    if (service === "gmail" && action === "list_messages") {
      return summarizeGmailList(result);
    }
    if (service === "gmail" && action === "read_message") {
      return summarizeGmailRead(result);
    }
  } catch {
    // Fall through to raw JSON on formatter errors.
  }
  return asJsonString(result).slice(0, MAX_RESULT_CHARS);
}

export interface ConnectorToolOutcome {
  ok: boolean;
  result?: string;
  error?: string;
}

/**
 * Execute one connector tool call for a user. Validates the service/action
 * against the registry, merges arg defaults, runs via Composio, and returns
 * a model-ready (truncated, summarized) result string.
 */
export async function executeConnectorTool(
  userId: string,
  service: string,
  action: string,
  rawArgs: unknown,
): Promise<ConnectorToolOutcome> {
  const svc = service.trim().toLowerCase();
  const act = action.trim().toLowerCase();
  const def = TRO_CONNECTOR_ACTIONS[svc];
  const actionDef = def?.actions[act];
  if (!def || !actionDef) {
    return { ok: false, error: `Unknown connector action "${svc}.${act}".` };
  }
  if (!composioConfigured()) {
    return { ok: false, error: "Connector execution is not configured." };
  }

  const sanitized = sanitizeArgs(rawArgs, actionDef);
  if (!sanitized.ok) return { ok: false, error: sanitized.error };

  let raw: unknown;
  try {
    // Session path first (same as /api/composio/execute) — falls back to
    // direct tools.execute, which resolves the user's connected account.
    try {
      const created = await createUserSession(userId, { toolkits: [def.toolkit] });
      raw = await executeOnSession(created.session, actionDef.tool, sanitized.args);
    } catch {
      raw = await executeTool(userId, actionDef.tool, sanitized.args);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool execution failed.";
    console.error("[tro-connector-tools]", svc, act, message);
    return { ok: false, error: message };
  }

  return { ok: true, result: summarizeResult(svc, act, raw) };
}
