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

export type ArtifactKind = "doc" | "sheet" | "deck" | "note" | "code";

export const ARTIFACT_KINDS: ArtifactKind[] = ["doc", "sheet", "deck", "note", "code"];

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

const FENCE = /```artifact\s*\n([\s\S]*?)```/g;

function cleanBlock(data: unknown): ArtifactBlock | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { kind?: unknown; title?: unknown; content?: unknown };
  const kind =
    typeof d.kind === "string" && (ARTIFACT_KINDS as string[]).includes(d.kind)
      ? (d.kind as ArtifactKind)
      : "doc";
  const title =
    typeof d.title === "string" && d.title.trim()
      ? d.title.trim().slice(0, 140)
      : "Untitled";
  const content =
    typeof d.content === "string" && d.content.trim()
      ? d.content.slice(0, 120_000)
      : "";
  if (!content) return null;
  return { kind, title, content };
}

/** All artifact blocks in a reply, in order. */
export function extractArtifactBlocks(text: string): ParsedArtifact[] {
  const out: ParsedArtifact[] = [];
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE.exec(text)) !== null) {
    try {
      const block = cleanBlock(JSON.parse(m[1]));
      if (block) out.push({ block, start: m.index, end: m.index + m[0].length });
    } catch {
      /* malformed JSON — leave the fence visible */
    }
    if (out.length >= 5) break;
  }
  return out;
}

/** Reply text with artifact fences removed (for display). */
export function stripArtifactBlocks(text: string): string {
  FENCE.lastIndex = 0;
  return text.replace(FENCE, "").trim();
}

/** Stable fingerprint so the client saves each block exactly once. */
export function artifactFingerprint(block: ArtifactBlock): string {
  let h = 0;
  const s = `${block.kind}|${block.title}|${block.content.length}|${block.content.slice(0, 64)}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
