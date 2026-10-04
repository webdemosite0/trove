// Local-browser tool-call protocol for Tros.
// When a Tro needs to act in the USER's own browser (via the Trove browser
// extension), it emits a fenced block in its reply:
//
//   ```local-browser
//   {"op":"click","selector":"button.search"}
//   ```
//
// These blocks are parsed client-side, enqueued via POST /api/extension/enqueue,
// executed by the paired extension in the user's active tab, and the results
// are fed back to the Tro in a follow-up turn. NEVER shown in chat.
//
// This is separate from ```browser-tool``` (the Tro's CLOUD browser).
// Prefer the local browser when the user says "in my browser" / "on this tab".
//
// Ops:
//   tabs       {"op":"tabs"}                                    list open tabs
//   read       {"op":"read"}                                    active tab text (truncated)
//   navigate   {"op":"navigate","url":"https://..."}            go to a page
//   click      {"op":"click","selector":"css"}                  click element
//   type       {"op":"type","selector":"css","text":"hi","submit":true}  fill + optional submit
//   scroll     {"op":"scroll","direction":"down"}               scroll (up|down|top|bottom)
//   screenshot {"op":"screenshot"}                              capture visible tab

export type LocalBrowserOp =
  | "tabs"
  | "read"
  | "navigate"
  | "click"
  | "type"
  | "scroll"
  | "screenshot";

export interface LocalBrowserCall {
  op: LocalBrowserOp;
  url?: string;
  selector?: string;
  text?: string;
  direction?: string;
  submit?: boolean;
}

export interface ParsedLocalBrowser {
  calls: LocalBrowserCall[];
  /** The reply with all local-browser blocks stripped (what the user sees). */
  text: string;
}

const BLOCK_RE = /^```local-browser\s*\n([\s\S]*?)\n```[ \t]*$/gim;

const VALID_OPS: LocalBrowserOp[] = [
  "tabs",
  "read",
  "navigate",
  "click",
  "type",
  "scroll",
  "screenshot",
];

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

function normalize(raw: Record<string, unknown> | null): LocalBrowserCall | null {
  if (!raw) return null;
  const op = typeof raw.op === "string" ? raw.op.toLowerCase() : "";
  if (!(VALID_OPS as string[]).includes(op)) return null;
  const call: LocalBrowserCall = { op: op as LocalBrowserOp };
  if (typeof raw.url === "string") call.url = raw.url;
  if (typeof raw.selector === "string") call.selector = raw.selector;
  if (typeof raw.text === "string") call.text = raw.text;
  if (typeof raw.direction === "string") call.direction = raw.direction;
  if (raw.submit === true) call.submit = true;
  return call;
}

export function parseLocalBrowser(text: string): ParsedLocalBrowser {
  const calls: LocalBrowserCall[] = [];
  const clean = String(text ?? "").replace(BLOCK_RE, (_m, json: string) => {
    const c = normalize(tryJson(json));
    if (c) calls.push(c);
    return "";
  });
  return { calls, text: clean };
}

/** Short human label for activity feed / status UI. */
export function localBrowserLabel(call: LocalBrowserCall): string {
  switch (call.op) {
    case "tabs":
      return "Listing your open tabs…";
    case "read":
      return "Reading your tab…";
    case "navigate":
      return `Opening ${call.url ?? "page"} in your browser…`;
    case "click":
      return "Clicking in your browser…";
    case "type":
      return `Typing in your browser${call.submit ? " and submitting" : ""}…`;
    case "scroll":
      return `Scrolling ${call.direction ?? "down"} in your browser…`;
    case "screenshot":
      return "Capturing your tab…";
    default:
      return "Working in your browser…";
  }
}

/** Prompt section teaching the Tro the local-browser protocol. */
export function buildLocalBrowserSection(): string {
  return `YOUR BROWSER (via the Trove extension)
You can also act in the USER's own browser — their tabs, their logins — when they have the Trove extension installed. This is different from your CLOUD COMPUTER (a separate cloud session).

Use the local browser when the user says "in my browser", "on this tab", "my Gmail", or anything that lives in their own logged-in sessions. Prefer the cloud computer for anonymous research.

End your reply with exactly one fenced block per action (after any short note to the user):

\`\`\`local-browser
{"op": "tabs"}
\`\`\`

Ops: tabs (list open tabs) · read (active tab text) · navigate {"url"} · click {"selector"} · type {"selector","text","submit"} · scroll {"direction":"up|down|top|bottom"} · screenshot.

Rules:
- NEVER act on the user's browser for sensitive actions (purchases, sending messages, deleting things, changing settings) without their explicit go-ahead in THIS conversation. Ask with an ask-card first.
- If a local-browser action reports "No local browser connected", tell the user to install the Trove extension from Settings → Browser, and offer the cloud computer as an alternative.
- Narrate what you're doing briefly ("I'll open your inbox…") — the user can watch it happen in their browser.`;
}
