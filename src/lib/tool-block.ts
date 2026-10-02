// Connector tool-call protocol for Tros and the main Trove chat.
// When an agent needs live data or an action from an @mentioned integration,
// it emits a fenced block in its reply:
//
//   ```connector-tool
//   {"service": "gmail", "tool": "GMAIL_SEND_EMAIL", "args": {"recipient_email": "a@b.com", "subject": "Hi", "body": "..."}}
//   ```
//
// Legacy form (still accepted): {"service": "gmail", "action": "list_messages", "args": {...}}
//
// These blocks are parsed client-side, executed via /api/tro/tools, and the
// results are fed back to the agent in a follow-up turn. NEVER shown in chat.

export interface ConnectorToolCall {
  service: string;
  /** Composio tool slug, e.g. GMAIL_SEND_EMAIL (preferred form). */
  tool?: string;
  /** Legacy curated action name, e.g. list_messages. */
  action?: string;
  args: Record<string, unknown>;
}

export interface ParsedConnectorTools {
  calls: ConnectorToolCall[];
  /** The reply with all connector-tool blocks stripped (what the user sees). */
  text: string;
}

const BLOCK_RE = /^```connector-tool\s*\n([\s\S]*?)\n```[ \t]*$/gim;

function tryJson(raw: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(raw.trim()) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Human-readable label for a call, e.g. "gmail.GMAIL_SEND_EMAIL". */
export function toolCallLabel(call: ConnectorToolCall): string {
  return `${call.service}.${call.tool ?? call.action ?? "tool"}`;
}

/** Parse and strip connector-tool blocks from an agent reply. */
export function parseConnectorToolBlocks(input: string): ParsedConnectorTools {
  const calls: ConnectorToolCall[] = [];
  if (!input || !input.includes("connector-tool")) {
    return { calls, text: input };
  }
  const text = input.replace(BLOCK_RE, (_m, body: string) => {
    const data = tryJson(body);
    if (!data) return "";
    const service = String(data.service ?? "").trim().toLowerCase();
    const tool = String(data.tool ?? "").trim();
    const action = String(data.action ?? "").trim().toLowerCase();
    const args =
      data.args && typeof data.args === "object" && !Array.isArray(data.args)
        ? (data.args as Record<string, unknown>)
        : {};
    if (service && (tool || action)) {
      calls.push({
        service,
        ...(tool ? { tool } : {}),
        ...(action ? { action } : {}),
        args,
      });
    }
    return "";
  });
  // Collapse the blank lines left behind by stripped blocks.
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  return { calls, text: cleaned };
}

/** Strip connector-tool blocks without parsing (for display safety). */
export function stripConnectorToolBlocks(input: string): string {
  return parseConnectorToolBlocks(input).text;
}
