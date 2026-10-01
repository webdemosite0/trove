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

const FENCE = /```ask\s*\n([\s\S]*?)```/g;

function cleanBlock(data: unknown): AskBlock | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { title?: unknown; questions?: unknown };
  const raw = Array.isArray(d.questions) ? d.questions : [];
  const questions: AskQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as { q?: unknown; type?: unknown; options?: unknown };
    if (typeof q.q !== "string" || !q.q.trim()) continue;
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o).slice(0, 120)).filter((o) => o.trim()).slice(0, 6)
      : [];
    if (!options.length) continue;
    questions.push({
      q: q.q.trim().slice(0, 300),
      type: q.type === "check" ? "check" : "radio",
      options,
    });
    if (questions.length >= 4) break;
  }
  if (!questions.length) return null;
  return {
    title: typeof d.title === "string" && d.title.trim() ? d.title.trim().slice(0, 120) : undefined,
    questions,
  };
}

/** Extract all well-formed ask blocks from a reply, with their offsets. */
export function extractAskBlocks(text: string): ParsedAsk[] {
  const out: ParsedAsk[] = [];
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE.exec(text)) !== null) {
    try {
      const block = cleanBlock(JSON.parse(m[1]));
      if (block) out.push({ block, start: m.index, end: m.index + m[0].length });
    } catch {
      /* malformed block — leave it as visible text */
    }
  }
  return out;
}

/** Remove ask blocks from displayed message text. */
export function stripAskBlocks(text: string): string {
  FENCE.lastIndex = 0;
  return text.replace(FENCE, "").replace(/\n{3,}/g, "\n\n").trim();
}
