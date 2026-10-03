// Browser tool-call protocol for Tros.
// When a Tro needs to browse the web, it emits a fenced block in its reply:
//
//   ```browser-tool
//   {"op": "navigate", "url": "https://example.com"}
//   ```
//
// These blocks are parsed client-side, executed against the Tro's cloud
// browser session via /api/tro/browser, and the results are fed back to the
// Tro in a follow-up turn. NEVER shown in chat.
//
// Ops:
//   navigate  {"op":"navigate","url":"https://..."}      go to a page
//   observe   {"op":"observe"}                          list clickable/typeable elements ([ref] label)
//   read      {"op":"read"}                              page text content (truncated)
//   click     {"op":"click","ref":3}                    click element by ref (or "selector")
//   type      {"op":"type","ref":5,"text":"hi","submit":true}  type into element by ref/selector
//   screenshot {"op":"screenshot"}                      refresh the Desktop panel screenshot
//   back      {"op":"back"}                              go back one page
//   scroll    {"op":"scroll","direction":"down"}        scroll (up|down|top|bottom)

export type BrowserToolOp =
  | "navigate"
  | "observe"
  | "read"
  | "click"
  | "type"
  | "screenshot"
  | "back"
  | "scroll";

export interface BrowserToolCall {
  op: BrowserToolOp;
  url?: string;
  ref?: number;
  selector?: string;
  text?: string;
  direction?: string;
  submit?: boolean;
}

export interface ParsedBrowserTools {
  calls: BrowserToolCall[];
  /** The reply with all browser-tool blocks stripped (what the user sees). */
  text: string;
}

const BLOCK_RE = /^```browser-tool\s*\n([\s\S]*?)\n```[ \t]*$/gim;

const VALID_OPS: BrowserToolOp[] = [
  "navigate",
  "observe",
  "read",
  "click",
  "type",
  "screenshot",
  "back",
  "scroll",
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

function normalizeOp(raw: Record<string, unknown> | null): BrowserToolCall | null {
  if (!raw) return null;
  const op = typeof raw.op === "string" ? raw.op.toLowerCase() : "";
  if (!(VALID_OPS as string[]).includes(op)) return null;
  const call: BrowserToolCall = { op: op as BrowserToolOp };
  if (typeof raw.url === "string") call.url = raw.url;
  if (typeof raw.ref === "number") call.ref = raw.ref;
  if (typeof raw.selector === "string") call.selector = raw.selector;
  if (typeof raw.text === "string") call.text = raw.text;
  if (typeof raw.direction === "string") call.direction = raw.direction;
  if (typeof raw.submit === "boolean") call.submit = raw.submit;
  return call;
}

export function parseBrowserToolBlocks(text: string): ParsedBrowserTools {
  const calls: BrowserToolCall[] = [];
  BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    const parsed = tryJson(m[1]);
    const call = normalizeOp(parsed);
    if (call) calls.push(call);
  }
  return { calls, text: stripBrowserToolBlocks(text) };
}

export function stripBrowserToolBlocks(text: string): string {
  BLOCK_RE.lastIndex = 0;
  return text.replace(BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Human label for activity feed + follow-up narration. */
export function browserToolLabel(call: BrowserToolCall): string {
  switch (call.op) {
    case "navigate":
      return call.url ? `Opening ${call.url}` : "Opening page";
    case "observe":
      return "Reading page elements";
    case "read":
      return "Reading page text";
    case "click":
      return "Clicking";
    case "type":
      return "Typing";
    case "screenshot":
      return "Capturing screen";
    case "back":
      return "Going back";
    case "scroll":
      return "Scrolling";
  }
}

/** System-prompt section teaching the Tro to drive its cloud browser. */
export function buildTroBrowserToolSection(): string {
  return `
BROWSER TOOLS — YOUR CLOUD COMPUTER
You have a real cloud browser (Chromium) in the Desktop panel of this chat. It starts automatically when you need it. You drive it with fenced blocks — this is how you actually open pages, read them, and click through them, exactly like a person would.

To act on the browser, put exactly one block per action at the end of your reply (or after a short line like "Opening that now…"):

\`\`\`browser-tool
{"op": "navigate", "url": "https://example.com"}
\`\`\`

Available ops:
- {"op": "navigate", "url": "https://…"} — open a page. URL must start with http:// or https://.
- {"op": "observe"} — list the page's clickable/typeable elements as numbered [ref] entries.
- {"op": "read"} — get the page's visible text content.
- {"op": "click", "ref": 3} — click element [3] from the last observe. ("selector" also works for simple cases.)
- {"op": "type", "ref": 5, "text": "hello", "submit": true} — type into element [5]; submit presses Enter.
- {"op": "scroll", "direction": "down"} — scroll the page (up | down | top | bottom).
- {"op": "back"} — go back one page.
- {"op": "screenshot"} — refresh the screenshot shown in the user's Desktop panel.

Rules:
- Max 3 actions per round. The results come back to you in this same turn and you continue from them.
- Workflow: navigate → observe (or read) → click/type by ref → observe again to verify. Never invent ref numbers — always observe first.
- These blocks are stripped before the user sees your reply, so narrate briefly ("Looking that up…"), then answer from the results.
- If a page won't load or an action fails, say so plainly and suggest the fix — never claim you saw something you didn't.
- Screenshots refresh the user's Desktop panel automatically; they are for the user, you "see" through observe/read results.
- Respect the page: don't hammer it, don't submit forms the user didn't ask for, and never enter credentials or payments without the user's explicit go-ahead.
`;
}
