// Connector tools for Tros and the main Trove chat (server-only).
//
// When a user @mentions a connected integration, the agent gets real,
// callable actions for that integration for the turn. The model emits
// ```connector-tool blocks (see src/lib/tool-block.ts); the chat client
// executes them through /api/tro/tools, which runs them here.
//
// Tool discovery is DYNAMIC: for each @mentioned service we resolve its
// Composio toolkit and fetch that toolkit's live tool list from Composio
// (cached 24h). This is how all 4,000+ Composio apps work — nothing is
// limited to a hardcoded service list. A small curated registry below
// serves as fallback (and powers the legacy {"action": ...} blocks).

import "server-only";

import {
  composioConfigured,
  createUserSession,
  executeOnSession,
  executeTool,
  listToolkitTools,
  type ComposioToolDef,
} from "@/lib/composio";
import { composioToolkitFor } from "@/lib/composio-map";
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
  /** Sends/creates/posts — surfaced as [WRITE] so the model is careful. */
  write?: boolean;
}

export interface ConnectorServiceDef {
  label: string;
  /** Composio toolkit slug for session creation. */
  toolkit: string;
  actions: Record<string, ConnectorActionDef>;
}

/**
 * Curated registry: fallback when live discovery is unavailable, and the
 * source of truth for the legacy {"action": ...} block form.
 *
 * Gmail slugs verified against Composio docs (GMAIL_FETCH_EMAILS defaults
 * max_results to 1 — always pass/merge a default; FETCH_EMAILS returns
 * metadata only, hydrate via GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID).
 * Other slugs follow the TOOLKIT_ACTION pattern (best-effort); live
 * discovery is authoritative whenever it succeeds.
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
      send_email: {
        tool: "GMAIL_SEND_EMAIL",
        description:
          "Send an email. Double-check the recipient address from the conversation — never invent addresses.",
        argHint: `{"recipient_email": "name@example.com", "subject": "...", "body": "..."}`,
        write: true,
      },
      create_draft: {
        tool: "GMAIL_CREATE_DRAFT",
        description: "Create a draft email without sending it.",
        argHint: `{"recipient_email": "name@example.com", "subject": "...", "body": "..."}`,
        write: true,
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
      post_message: {
        tool: "SLACK_SEND_MESSAGE",
        description:
          "Post a message to a channel. Confirm the channel with the user if ambiguous — never guess channel names.",
        argHint: `{"channel": "#general", "text": "..."}`,
        write: true,
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
      create_folder: {
        tool: "GOOGLEDRIVE_CREATE_FOLDER",
        description: "Create a folder in Drive.",
        argHint: `{"name": "Q4 Planning"}`,
        write: true,
      },
      upload_file: {
        tool: "GOOGLEDRIVE_UPLOAD_FILE",
        description:
          "Upload/create a file in Drive. Provide a file name and text content.",
        argHint: `{"name": "notes.txt", "content": "..."}`,
        write: true,
      },
    },
  },
  "google-calendar": {
    label: "Google Calendar",
    toolkit: "googlecalendar",
    actions: {
      find_event: {
        tool: "GOOGLECALENDAR_FIND_EVENT",
        description:
          "Find events in a time range. Times are RFC3339, e.g. 2026-10-03T00:00:00Z.",
        argHint: `{"calendar_id": "primary", "time_min": "2026-10-03T00:00:00Z", "time_max": "2026-10-10T00:00:00Z"}`,
      },
      find_free_slots: {
        tool: "GOOGLECALENDAR_FIND_FREE_SLOTS",
        description: "Find free time slots in a range.",
        argHint: `{"calendar_id": "primary", "time_min": "2026-10-03T09:00:00Z", "time_max": "2026-10-03T17:00:00Z"}`,
      },
      create_event: {
        tool: "GOOGLECALENDAR_CREATE_EVENT",
        description:
          "Create a calendar event. Confirm time/title with the user if ambiguous.",
        argHint: `{"calendar_id": "primary", "summary": "Team sync", "start": "2026-10-04T09:00:00Z", "end": "2026-10-04T09:30:00Z"}`,
        write: true,
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
      create_issue: {
        tool: "GITHUB_CREATE_ISSUE",
        description: "Create an issue in a repository.",
        argHint: `{"owner": "octo", "repo": "hello", "title": "...", "body": "..."}`,
        write: true,
      },
      comment_issue: {
        tool: "GITHUB_CREATE_ISSUE_COMMENT",
        description: "Comment on an issue or pull request.",
        argHint: `{"owner": "octo", "repo": "hello", "issue_number": 42, "body": "..."}`,
        write: true,
      },
    },
  },
};

export function connectorServiceDef(service: string): ConnectorServiceDef | null {
  return TRO_CONNECTOR_ACTIONS[service.toLowerCase()] ?? null;
}

/** Legacy {"action": ...} form → Composio tool slug (backward compat). */
export function actionToToolSlug(service: string, action: string): string | null {
  const def = connectorServiceDef(service);
  const act = def?.actions[action.trim().toLowerCase()];
  return act ? act.tool : null;
}

/**
 * Resolve a Trove service id to its Composio toolkit slug. Uses the
 * explicit map first, then falls back to the normalized service id so
 * newly-connected apps work without a code change.
 */
export function resolveToolkitSlug(service: string): string | null {
  const svc = service.trim().toLowerCase();
  if (!svc) return null;
  const mapped = composioToolkitFor(svc);
  if (mapped) return mapped;
  return svc.replace(/-/g, "_");
}

/** Can this service plausibly offer callable tools? (cheap, no network) */
export function canResolveConnectorToolkit(service: string): boolean {
  return resolveToolkitSlug(service) !== null;
}

/* ------------------------------------------------------------------ */
/* Dynamic tool discovery                                              */
/* ------------------------------------------------------------------ */

export interface ResolvedTool {
  /** Canonical Composio tool slug, e.g. GMAIL_SEND_EMAIL. */
  slug: string;
  description: string;
  requiredParams: string[];
  allParams: string[];
  /** True when the curated registry flags it as a write action. */
  write: boolean;
  source: "live" | "curated";
}

const MAX_TOOLS_PER_SERVICE = 25;

/** Prefer widely-used actions over obscure ones; cap the prompt cost. */
function rankTools(tools: ComposioToolDef[]): ComposioToolDef[] {
  const scored = tools.map((t) => {
    const s = `${t.slug} ${t.name} ${t.description}`.toLowerCase();
    let score = 0;
    if (/\b(list|get|fetch|search|find|read|retrieve|show)\b/.test(s)) score += 3;
    if (/\b(create|send|post|add|update|upload|share|invite)\b/.test(s)) score += 3;
    if (/\b(delete|remove|trash|archive|cancel)\b/.test(s)) score += 1;
    // Shorter, more general tools first.
    score += Math.max(0, 48 - t.slug.length) / 24;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score || a.t.slug.localeCompare(b.t.slug));
  return scored.slice(0, MAX_TOOLS_PER_SERVICE).map((x) => x.t);
}

function curatedWriteSlugs(service: string): Set<string> {
  const def = connectorServiceDef(service);
  const out = new Set<string>();
  if (!def) return out;
  for (const a of Object.values(def.actions)) {
    if (a.write) out.add(a.tool.toUpperCase());
  }
  return out;
}

/**
 * Resolve the callable tools for one connected service: live Composio
 * toolkit tools first (ranked + capped), curated registry as fallback.
 */
export async function resolveServiceTools(
  service: string,
): Promise<{ toolkit: string; tools: ResolvedTool[] }> {
  const svc = service.trim().toLowerCase();
  const toolkit = resolveToolkitSlug(svc) ?? svc;
  const writeSlugs = curatedWriteSlugs(svc);

  try {
    const live = await listToolkitTools(toolkit);
    if (live.length) {
      const tools: ResolvedTool[] = rankTools(live).map((t) => ({
        slug: t.slug,
        description: t.description || t.name,
        requiredParams: t.requiredParams,
        allParams: t.allParams,
        write: writeSlugs.has(t.slug.toUpperCase()),
        source: "live" as const,
      }));
      return { toolkit, tools };
    }
  } catch {
    // Fall through to curated fallback.
  }

  const def = connectorServiceDef(svc);
  if (def) {
    return {
      toolkit: def.toolkit,
      tools: Object.values(def.actions).map((a) => ({
        slug: a.tool,
        description: a.description,
        requiredParams: [],
        allParams: [],
        write: Boolean(a.write),
        source: "curated" as const,
      })),
    };
  }
  return { toolkit, tools: [] };
}

/**
 * Validate that a tool slug is callable for a service: it must appear in
 * the toolkit's live tool list (authoritative), or in the curated
 * registry when live discovery is unavailable. Returns the canonical slug
 * and toolkit on success.
 */
export async function validateConnectorTool(
  service: string,
  toolSlug: string,
): Promise<
  | { ok: true; tool: string; toolkit: string }
  | { ok: false; error: string }
> {
  const svc = service.trim().toLowerCase();
  const want = toolSlug.trim().toUpperCase();
  if (!svc || !want) {
    return { ok: false, error: "Service and tool are required." };
  }
  const { toolkit, tools } = await resolveServiceTools(svc);
  const hit = tools.find((t) => t.slug.toUpperCase() === want);
  if (hit) {
    return { ok: true, tool: hit.slug, toolkit };
  }
  return {
    ok: false,
    error: `"${toolSlug}" is not an available ${svc} tool. Only call tools listed in CONNECTOR TOOLS.`,
  };
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

function toolLine(t: ResolvedTool): string {
  const desc = t.description.replace(/\s+/g, " ").slice(0, 110);
  const params =
    t.requiredParams.length > 0
      ? ` Required: ${t.requiredParams.join(", ")}.`
      : t.allParams.length > 0
        ? ` Params: ${t.allParams.slice(0, 8).join(", ")}.`
        : "";
  const write = t.write ? " [WRITE]" : "";
  return `- \`${t.slug}\`${write} — ${desc}.${params}`;
}

/**
 * Build the CONNECTOR TOOLS prompt section for the services the user
 * @mentioned this turn. Works for ANY connected service via live
 * Composio tool discovery (4,000+ apps) — not just the curated five.
 * Returns "" when there is nothing callable.
 */
export async function buildTroConnectorToolSection(
  userId: string,
  requestedServices: string[],
): Promise<string> {
  const connected = await connectedServices(userId);
  const usable = [...new Set(requestedServices.map((s) => s.toLowerCase()))].filter(
    (s) => connected.has(s) && canResolveConnectorToolkit(s),
  );
  if (!usable.length) return "";

  const sections: string[] = [];
  for (const service of usable) {
    let resolved: { toolkit: string; tools: ResolvedTool[] };
    try {
      resolved = await resolveServiceTools(service);
    } catch {
      continue;
    }
    if (!resolved.tools.length) continue;
    const meta = SERVICES.find((s) => s.id === service);
    const label = meta?.name ?? service;
    sections.push(
      `### ${label} (@${service})\n${resolved.tools.map(toolLine).join("\n")}`,
    );
  }
  if (!sections.length) return "";

  return `
CONNECTOR TOOLS — LIVE INTEGRATION ACTIONS
The user @mentioned these connected integrations: ${usable.map((s) => "@" + s).join(", ")}. You can call their real APIs right now with a fenced block — this is how you read live data and take real actions instead of saying you can't.

To call a tool, put exactly one block per call at the end of your reply (or after a short line like "Checking your inbox…"):

\`\`\`connector-tool
{"service": "gmail", "tool": "GMAIL_SEND_EMAIL", "args": {"recipient_email": "a@b.com", "subject": "Hi", "body": "Hello!"}}
\`\`\`

Available tools:
${sections.join("\n\n")}

Rules:
- Max 3 calls per round. The results come back to you in this same turn and you answer from them.
- Only call tools listed above, only for the @mentioned services. Never call anything else, never invent tool names.
- "args" must be a JSON object. For Gmail, always list/fetch emails before reading one — never invent message ids.
- [WRITE] tools send, post, create, or change things. Double-check recipients, channels, and targets from the conversation — never invent email addresses, channel names, repo names, or ids. If the target is ambiguous, ask the user first instead of guessing.
- These blocks are stripped before the user sees your reply, so narrate briefly, then answer from the results.
- If a call fails, say what happened plainly and suggest the fix (e.g. reconnect the app) — never claim the integration is unavailable when it is connected.
- For [WRITE] tools, only tell the user the action succeeded when the result contains concrete provider confirmation (a message/thread id, a posted-message timestamp, a created issue/PR number). If the result is empty or ambiguous, say "I couldn't verify it went through" and offer to retry or check — never announce success you can't verify.
- NEVER substitute a saved note, document, or any library artifact for a connector action. A note titled "Email to X" does NOT send an email. A note titled "Calendar Event" does NOT create or reschedule a calendar event. If you tell the user you are sending, posting, creating, or scheduling something through a connected integration, you MUST emit the connector-tool block in the same reply — narration without the block means nothing happened.
`;
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

const MAX_ARGS_CHARS = 4096;
const MAX_RESULT_CHARS = 15000;
/** Hard ceiling for any single connector call — a hung provider must never
 *  pause the chat forever. */
const TOOL_CALL_TIMEOUT_MS = 60_000;

/** Reject if `promise` doesn't settle within `ms`. The underlying operation
 *  keeps running, but the chat moves on instead of pausing forever. */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s.`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sanitizeArgs(
  raw: unknown,
  opts?: { defaults?: Record<string, unknown>; maxResults?: number },
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "args must be a JSON object." };
  }
  const json = JSON.stringify(raw);
  if (json.length > MAX_ARGS_CHARS) {
    return { ok: false, error: "args too large." };
  }
  const args: Record<string, unknown> = { ...(opts?.defaults ?? {}) };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) continue;
    args[k] = v;
  }
  // Bound result-size args so one call can't flood the context.
  const cap = opts?.maxResults ?? 50;
  for (const key of ["max_results", "maxResults", "count", "limit", "per_page"]) {
    const n = Number(args[key]);
    if (Number.isFinite(n)) {
      args[key] = Math.max(1, Math.min(cap, Math.floor(n)));
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

function summarizeResult(service: string, tool: string, result: unknown): string {
  try {
    const slug = tool.toUpperCase();
    if (service === "gmail" && slug === "GMAIL_FETCH_EMAILS") {
      return summarizeGmailList(result);
    }
    if (service === "gmail" && slug === "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID") {
      return summarizeGmailRead(result);
    }
    if (service === "gmail" && slug === "GMAIL_SEND_EMAIL") {
      return summarizeGmailSend(result);
    }
  } catch {
    // Fall through to raw JSON on formatter errors.
  }
  return asJsonString(result).slice(0, MAX_RESULT_CHARS);
}

/**
 * Gmail send results: extract the provider's confirmation so the model can
 * distinguish a real send (message/thread id present) from an empty or
 * ambiguous payload. Composio wraps the Gmail API response, so look in both
 * the top level and common `data` wrappers.
 */
function summarizeGmailSend(result: unknown): string {
  const pick = (obj: unknown): Record<string, unknown> | null => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    const r = obj as Record<string, unknown>;
    // Unwrap common Composio envelopes.
    for (const key of ["data", "response_data", "result"]) {
      const inner = pick(r[key]);
      if (inner && (inner.id || inner.threadId || inner.messageId)) return inner;
    }
    return r;
  };
  const r = pick(result);
  const id =
    (r?.id as string) || (r?.messageId as string) || (r?.message_id as string);
  const threadId = (r?.threadId as string) || (r?.thread_id as string);
  const labelIds = r?.labelIds ?? r?.label_ids;
  if (id || threadId) {
    return (
      `Email sent and confirmed by Gmail.` +
      (id ? ` Message id: ${id}.` : "") +
      (threadId ? ` Thread id: ${threadId}.` : "") +
      (Array.isArray(labelIds) && labelIds.includes("SENT")
        ? " It appears in the Sent folder."
        : "")
    );
  }
  return (
    "Gmail did not return a message id — the send could not be verified. " +
    "Raw response: " +
    asJsonString(result).slice(0, 2000)
  );
}

export interface ConnectorToolOutcome {
  ok: boolean;
  result?: string;
  error?: string;
}

/**
 * Execute one connector tool call for a user. `tool` is the Composio tool
 * slug (validated beforehand via validateConnectorTool). Runs via Composio
 * and returns a model-ready (truncated, summarized) result string.
 */
export async function executeConnectorTool(
  userId: string,
  service: string,
  tool: string,
  rawArgs: unknown,
): Promise<ConnectorToolOutcome> {
  const svc = service.trim().toLowerCase();
  const toolSlug = tool.trim();
  if (!svc || !toolSlug) {
    return { ok: false, error: "Service and tool are required." };
  }
  const toolkit = resolveToolkitSlug(svc) ?? svc;
  if (!composioConfigured()) {
    return { ok: false, error: "Connector execution is not configured." };
  }

  // Merge curated defaults when the tool came from the curated registry.
  const curatedDef = connectorServiceDef(svc);
  const curatedAction = curatedDef
    ? Object.values(curatedDef.actions).find(
        (a) => a.tool.toUpperCase() === toolSlug.toUpperCase(),
      )
    : undefined;
  const sanitized = sanitizeArgs(rawArgs, {
    defaults: curatedAction?.defaults,
    maxResults: curatedAction?.maxResults,
  });
  if (!sanitized.ok) return { ok: false, error: sanitized.error };

  let raw: unknown;
  try {
    // Session path first (same as /api/composio/execute) — falls back to
    // direct tools.execute, which resolves the user's connected account.
    // Both are time-boxed: a hung provider must surface as a failed tool,
    // never as a permanently paused chat.
    //
    // Write safety: falling back is only safe when session *creation* failed
    // (nothing executed yet). If the session's execution itself failed or timed
    // out, the provider may already have acted — retrying a write could send
    // it twice, so writes fail closed instead.
    const isWrite =
      Boolean(curatedAction?.write) ||
      curatedWriteSlugs(svc).has(toolSlug.toUpperCase());
    let session: Awaited<ReturnType<typeof createUserSession>> | null = null;
    let sessionCreateFailed = false;
    try {
      session = await withTimeout(
        createUserSession(userId, { toolkits: [toolkit] }),
        TOOL_CALL_TIMEOUT_MS,
        "Connector session",
      );
    } catch {
      sessionCreateFailed = true;
    }
    if (sessionCreateFailed || !session) {
      raw = await withTimeout(
        executeTool(userId, toolSlug, sanitized.args),
        TOOL_CALL_TIMEOUT_MS,
        "Connector tool",
      );
    } else {
      try {
        raw = await withTimeout(
          executeOnSession(session.session, toolSlug, sanitized.args),
          TOOL_CALL_TIMEOUT_MS,
          "Connector tool",
        );
      } catch (execErr) {
        if (isWrite) throw execErr;
        raw = await withTimeout(
          executeTool(userId, toolSlug, sanitized.args),
          TOOL_CALL_TIMEOUT_MS,
          "Connector tool",
        );
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool execution failed.";
    console.error("[tro-connector-tools]", svc, toolSlug, message);
    return { ok: false, error: message };
  }

  // Composio can report a provider failure as a resolved payload rather than
  // a thrown error — never present that as success ("sent" emails that never
  // left the outbox came from this exact path).
  const failure = composioFailure(raw);
  if (failure) {
    console.error("[tro-connector-tools]", svc, toolSlug, "provider failure:", failure);
    return { ok: false, error: failure };
  }

  return { ok: true, result: summarizeResult(svc, toolSlug, raw) };
}

/**
 * Composio resolves the execution promise even when the provider call failed —
 * the failure arrives as a payload ({ successful: false, error }) rather than
 * a thrown error. Treating that as success is how a "sent" email never leaves
 * the outbox. This inspects the raw result and returns a failure message when
 * the provider explicitly reported one.
 */
function composioFailure(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.successful === false) {
    const err = r.error;
    return typeof err === "string" && err
      ? err
      : "The connected service reported the action failed.";
  }
  // Some tools return { data: null, error: "..." } with no successful flag.
  if (r.error && (r.data == null || r.data === "")) {
    const err = r.error;
    const msg = typeof err === "string" ? err : JSON.stringify(err);
    return msg ? msg.slice(0, 500) : "The connected service reported an error.";
  }
  return null;
}
