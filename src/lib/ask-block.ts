/**
 * Structured "agent asks the user" blocks.
 *
 * A Tro can ask a question by ending its reply with a fenced block:
 *
 * ```ask
 * {"title": "Pick a direction", "questions": [{"q": "Which market?", "type": "radio", "options": ["SMB", "Enterprise"]}]}
 * ```
 *
 * The client renders the block as an interactive ApprovalPrompt card and
 * posts the answers back as a normal user message.
 *
 * Tolerance notes (the model does not always obey the fence):
 * - A ```json fence carrying a questions payload is accepted too — models
 *   habitually emit ```json for any JSON. A ```json fence holding an
 *   artifact (kind/title/content) is left for the artifact parser.
 * - A fence cut off mid-block by a truncated stream is salvaged: complete
 *   question objects are parsed, the partial tail is dropped, and the card
 *   renders what survived (the truncated-reply card still shows Continue).
 * - A fence that looks like an ask attempt but cannot become a card is
 *   NEVER left as raw JSON: stripAskBlocks replaces it with a plain-text
 *   list of the questions.
 */

export interface AskQuestion {
  q: string;
  /** radio = pick one, check = pick many */
  type: "radio" | "check";
  options: string[];
}

export interface AskBlock {
  title?: string;
  questions: AskQuestion[];
}

export interface ParsedAsk {
  block: AskBlock;
  start: number;
  end: number;
}

/**
 * An ask-shaped fence that could not become an interactive card
 * (malformed JSON, nothing salvageable). Rendered as a plain-text list —
 * raw JSON must never reach the user.
 */
export interface AskFallback {
  title?: string;
  questions: string[];
  start: number;
  end: number;
}

const ASK_FENCE = /```ask\s*\n([\s\S]*?)```/g;
const JSON_FENCE = /```json\s*\n([\s\S]*?)```/g;
const FENCE_OPEN = /```(ask|json)\s*\n/g;

function cleanQuestion(item: unknown): AskQuestion | null {
  if (!item || typeof item !== "object") return null;
  const q = item as { q?: unknown; type?: unknown; options?: unknown };
  if (typeof q.q !== "string" || !q.q.trim()) return null;
  // Options are optional: a question without options renders with the
  // card's free-text input, which the answer flow already supports.
  const options = Array.isArray(q.options)
    ? q.options.map((o) => String(o).slice(0, 120)).filter((o) => o.trim()).slice(0, 6)
    : [];
  return {
    q: q.q.trim().slice(0, 300),
    type: q.type === "check" ? "check" : "radio",
    options,
  };
}

function cleanBlock(data: unknown): AskBlock | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { title?: unknown; questions?: unknown };
  const raw = Array.isArray(d.questions) ? d.questions : [];
  const questions: AskQuestion[] = [];
  for (const item of raw) {
    const q = cleanQuestion(item);
    if (q) questions.push(q);
    if (questions.length >= 4) break;
  }
  if (!questions.length) return null;
  return {
    title: typeof d.title === "string" && d.title.trim() ? d.title.trim().slice(0, 120) : undefined,
    questions,
  };
}

/** Does this look like a questions payload (rather than a code sample)? */
function looksLikeAskPayload(raw: string): boolean {
  return /"questions"\s*:\s*\[/.test(raw) && /"q"\s*:\s*"/.test(raw);
}

/** A ```json fence holding an artifact belongs to the artifact parser. */
function looksLikeArtifact(raw: string): boolean {
  return /"kind"\s*:\s*"(doc|sheet|deck|note|code|website|brand)"/i.test(raw);
}

/**
 * All `"key": "value"` strings in order. Tolerates a final value cut off
 * mid-string (no closing quote yet) — the truncated-stream case.
 */
function quotedValues(raw: string, key: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1]);
    lastEnd = m.index + m[0].length;
  }
  const tail = raw.slice(lastEnd);
  const um = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`).exec(tail);
  if (um && um[1].trim()) out.push(um[1]);
  return out;
}

function unescapeJson(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

/**
 * Index of the `}` matching the `{` at `start`, or -1 when unbalanced.
 * String-aware so braces inside quoted text don't count.
 */
function matchBrace(raw: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
      if (depth < 0) return -1;
    }
  }
  return -1;
}

/**
 * Salvage complete question objects from JSON the model emitted malformed
 * or that a truncated stream cut off mid-block. Parses what is complete and
 * drops the partial tail.
 */
function salvageQuestions(raw: string): AskBlock | null {
  if (!looksLikeAskPayload(raw)) return null;
  const titles = quotedValues(raw, "title");
  const title = titles.length ? unescapeJson(titles[0]).trim().slice(0, 120) : "";
  const questions: AskQuestion[] = [];
  let i = 0;
  while (i < raw.length && questions.length < 4) {
    const start = raw.indexOf("{", i);
    if (start < 0) break;
    const end = matchBrace(raw, start);
    if (end < 0) {
      i = start + 1;
      continue;
    }
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      /* not a complete object — scan inside it */
    }
    const q = cleanQuestion(parsed);
    if (q && !questions.some((x) => x.q === q.q)) {
      questions.push(q);
      i = end + 1;
    } else {
      i = start + 1;
    }
  }
  if (!questions.length) return null;
  return { title: title || undefined, questions };
}

/** Lenient last resort: pull "q" strings out of otherwise unparseable JSON. */
function fallbackQuestions(raw: string): { title?: string; questions: string[] } | null {
  if (!looksLikeAskPayload(raw)) return null;
  const titles = quotedValues(raw, "title");
  const title = titles.length ? unescapeJson(titles[0]).trim().slice(0, 120) : "";
  const questions: string[] = [];
  for (const v of quotedValues(raw, "q")) {
    const q = unescapeJson(v).trim().slice(0, 300);
    if (q && !questions.includes(q)) questions.push(q);
    if (questions.length >= 4) break;
  }
  if (!questions.length) return null;
  return { title: title || undefined, questions };
}

type AskRegion =
  | { kind: "card"; block: AskBlock; start: number; end: number }
  | { kind: "fallback"; title?: string; questions: string[]; start: number; end: number };

/** Parse one fence body into a region, or null when it isn't an ask attempt. */
function regionFromRaw(fence: string, raw: string, start: number, end: number): AskRegion | null {
  // A ```json fence holding an artifact belongs to the artifact parser.
  if (fence === "json" && looksLikeArtifact(raw)) return null;
  if (!looksLikeAskPayload(raw)) return null;
  let block: AskBlock | null = null;
  try {
    block = cleanBlock(JSON.parse(raw));
  } catch {
    block = salvageQuestions(raw);
  }
  if (!block) block = salvageQuestions(raw);
  if (block) return { kind: "card", block, start, end };
  const fb = fallbackQuestions(raw);
  if (fb) return { kind: "fallback", title: fb.title, questions: fb.questions, start, end };
  return null;
}

function scanAskRegions(text: string): AskRegion[] {
  const out: AskRegion[] = [];
  const scanFence = (re: RegExp, fence: string) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const region = regionFromRaw(fence, m[1], m.index, m.index + m[0].length);
      if (region) out.push(region);
    }
  };
  scanFence(ASK_FENCE, "ask");
  scanFence(JSON_FENCE, "json");

  // Unclosed trailing fence — the stream was cut mid-block. Salvage the
  // complete questions so the card still renders instead of raw JSON.
  const lastEnd = out.reduce((mx, r) => Math.max(mx, r.end), 0);
  FENCE_OPEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  let lastOpen: { fence: string; index: number } | null = null;
  while ((m = FENCE_OPEN.exec(text)) !== null) {
    // An opener with no closing fence after it is unclosed.
    if (text.indexOf("```", m.index + m[0].length) < 0 && m.index >= lastEnd) {
      lastOpen = { fence: m[1], index: m.index };
    }
  }
  if (lastOpen) {
    const rawStart = text.indexOf("\n", lastOpen.index) + 1;
    const raw = text
      .slice(rawStart)
      .replace(/<!-- trove:truncated -->\s*$/, "")
      .replace(/\s+$/, "");
    const region = regionFromRaw(lastOpen.fence, raw, lastOpen.index, text.length);
    if (region) out.push(region);
  }

  out.sort((a, b) => a.start - b.start);
  return out;
}

/** Extract all ask blocks that became interactive cards, with their offsets. */
export function extractAskBlocks(text: string): ParsedAsk[] {
  return scanAskRegions(text)
    .filter((r): r is Extract<AskRegion, { kind: "card" }> => r.kind === "card")
    .map(({ block, start, end }) => ({ block, start, end }));
}

/** Fences that looked like ask attempts but could not become cards. */
export function extractAskFallbacks(text: string): AskFallback[] {
  return scanAskRegions(text)
    .filter((r): r is Extract<AskRegion, { kind: "fallback" }> => r.kind === "fallback")
    .map(({ title, questions, start, end }) => ({ title, questions, start, end }));
}

function fallbackText(title: string | undefined, questions: string[]): string {
  const lines = questions.map((q, i) => `${i + 1}. ${q}`);
  return (title ? `${title}\n` : "") + lines.join("\n");
}

/**
 * Reply text with ask fences handled for display: parsed blocks are removed
 * (they render as interactive cards below the message); fences that could
 * not become cards are replaced with a plain-text question list — raw JSON
 * is never left for the user to stare at.
 */
export function stripAskBlocks(text: string): string {
  const regions = scanAskRegions(text);
  if (!regions.length) return text;
  let out = "";
  let last = 0;
  for (const r of regions) {
    out += text.slice(last, r.start);
    if (r.kind === "fallback") {
      out += "\n\n" + fallbackText(r.title, r.questions) + "\n\n";
    }
    last = r.end;
  }
  out += text.slice(last);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
