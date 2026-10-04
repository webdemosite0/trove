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

export type ArtifactKind = "doc" | "sheet" | "deck" | "note" | "code" | "website" | "brand";

export const ARTIFACT_KINDS: ArtifactKind[] = ["doc", "sheet", "deck", "note", "code", "website", "brand"];

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

/**
 * Structured content of a "brand" artifact (stored as JSON in `content`).
 * Image fields are filled server-side at save time from `logoPrompt` /
 * `imagePrompt` via the image API — the Tro never invents URLs.
 */
export interface BrandPaletteColor {
  name: string;
  hex: string;
}

export interface BrandExample {
  title: string;
  caption: string;
  /** Detailed prompt the server used (or will use) to generate the image. */
  imagePrompt?: string;
  /** Real URL once generated (remote URL or data URL). */
  imageUrl?: string | null;
}

export interface BrandSheet {
  name: string;
  tagline?: string;
  /** Detailed prompt the server used (or will use) to generate the logo. */
  logoPrompt?: string;
  /** Real URL once generated (remote URL or data URL). */
  logoUrl?: string | null;
  palette: BrandPaletteColor[];
  fonts: { heading: string; body: string };
  examples: BrandExample[];
  guidelines?: string;
}

/** Parse a brand artifact's JSON content; null when malformed. */
export function parseBrandSheet(content: string): BrandSheet | null {
  try {
    const d = JSON.parse(content) as Partial<BrandSheet>;
    if (!d || typeof d.name !== "string" || !d.name.trim()) return null;
    const palette = Array.isArray(d.palette)
      ? d.palette
          .filter((c) => c && typeof c.hex === "string")
          .map((c) => ({
            name: typeof c.name === "string" ? c.name : c.hex,
            hex: c.hex,
          }))
          .slice(0, 8)
      : [];
    const examples = Array.isArray(d.examples)
      ? d.examples
          .filter((e) => e && typeof e.title === "string")
          .map((e) => ({
            title: e.title,
            caption: typeof e.caption === "string" ? e.caption : "",
            imagePrompt: typeof e.imagePrompt === "string" ? e.imagePrompt : undefined,
            imageUrl: typeof e.imageUrl === "string" ? e.imageUrl : null,
          }))
          .slice(0, 6)
      : [];
    return {
      name: d.name.trim().slice(0, 80),
      tagline: typeof d.tagline === "string" ? d.tagline.slice(0, 160) : undefined,
      logoPrompt: typeof d.logoPrompt === "string" ? d.logoPrompt : undefined,
      logoUrl: typeof d.logoUrl === "string" ? d.logoUrl : null,
      palette,
      fonts: {
        heading: typeof d.fonts?.heading === "string" ? d.fonts.heading.slice(0, 60) : "—",
        body: typeof d.fonts?.body === "string" ? d.fonts.body.slice(0, 60) : "—",
      },
      examples,
      guidelines: typeof d.guidelines === "string" ? d.guidelines.slice(0, 4000) : undefined,
    };
  } catch {
    return null;
  }
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
