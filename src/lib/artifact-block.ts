/**
 * Structured "agent saves an artifact" blocks.
 *
 * A Tro can save a real artifact (doc, sheet, deck, note, code) by ending its
 * reply with a fenced block:
 *
 * ```artifact
 * {"kind": "doc", "title": "Launch brief", "content": "# Launch brief\n..."}
 * ```
 *
 * The client strips the block from the chat text, saves it via
 * POST /api/tro/artifacts, and renders an artifact card. Artifacts belong to
 * the Tro — each Tro has its own library in its workspace panel.
 */

export type ArtifactKind = "doc" | "sheet" | "deck" | "note" | "code" | "website";

export const ARTIFACT_KINDS: ArtifactKind[] = ["doc", "sheet", "deck", "note", "code", "website"];

export interface ArtifactBlock {
  kind: ArtifactKind;
  title: string;
  content: string;
}

export interface SavedArtifact extends ArtifactBlock {
  id: string;
  agentId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ParsedArtifact {
  block: ArtifactBlock;
  start: number;
  end: number;
}

const FENCE = /```(?:artifact|json)\s*\n([\s\S]*?)```/g;

function cleanBlock(data: unknown): ArtifactBlock | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { kind?: unknown; title?: unknown; content?: unknown };
  // Only treat as an artifact if it has the artifact shape (kind/title/content).
  // This keeps plain ```json code samples from being swallowed.
  if (typeof d.kind !== "string" || !(ARTIFACT_KINDS as string[]).includes(d.kind)) {
    return null;
  }
  if (typeof d.title !== "string" || !d.title.trim()) return null;
  if (typeof d.content !== "string" || !d.content.trim()) return null;
  const kind = d.kind as ArtifactKind;
  const title = d.title.trim().slice(0, 140);
  const content = d.content.slice(0, 120_000);
  return { kind, title, content };
}

/** All artifact blocks in a reply, in order. */
export function extractArtifactBlocks(text: string): ParsedArtifact[] {
  const out: ParsedArtifact[] = [];
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE.exec(text)) !== null) {
    const raw = m[1];
    let block: ArtifactBlock | null = null;
    try {
      block = cleanBlock(JSON.parse(raw));
    } catch {
      // Malformed JSON (common with large HTML payloads) — try lenient salvage.
      block = salvageBlock(raw);
    }
    if (block) out.push({ block, start: m.index, end: m.index + m[0].length });
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * Lenient salvage for artifact JSON the model emitted with unescaped
 * quotes/newlines (typical when "content" holds raw HTML). Extracts the
 * three fields with tolerant regexes instead of failing the whole block.
 */
function salvageBlock(raw: string): ArtifactBlock | null {
  const kindM = /"kind"\s*:\s*"([a-z]+)"/i.exec(raw);
  const titleM = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw);
  // Content runs to the last " before the closing brace — greedy is intentional.
  const contentM = /"content"\s*:\s*"([\s\S]*)"\s*\}?\s*$/.exec(raw);
  if (!kindM || !titleM || !contentM) return null;
  const kind = kindM[1].toLowerCase();
  if (!(ARTIFACT_KINDS as string[]).includes(kind)) return null;
  // Take the raw capture as-is: literal newlines/quotes are fine for HTML.
  // Only process the simple escapes the model likely emitted.
  const content = contentM[1]
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
  return cleanBlock({ kind, title: titleM[1], content });
}

/** Reply text with artifact fences removed (for display). Only removes
 * fences that parsed as valid artifact blocks — plain ```json samples stay. */
export function stripArtifactBlocks(text: string): string {
  const blocks = extractArtifactBlocks(text);
  if (!blocks.length) return text.trim();
  let out = "";
  let last = 0;
  for (const b of blocks) {
    out += text.slice(last, b.start);
    last = b.end;
  }
  out += text.slice(last);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Stable fingerprint so the client saves each block exactly once. */
export function artifactFingerprint(block: ArtifactBlock): string {
  let h = 0;
  const s = `${block.kind}|${block.title}|${block.content.length}|${block.content.slice(0, 64)}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
