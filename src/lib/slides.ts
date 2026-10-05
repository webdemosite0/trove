/**
 * Deck model + lenient markdown parser.
 * Layouts, themes, and image briefs vary per deck.
 */

export type SlideLayout =
  | "title"
  | "bullets"
  | "split"
  | "photo"
  | "quote"
  | "section";

export type DeckFont = "sans" | "serif" | "display" | "mono" | "rounded";
export type DeckPattern =
  | "solid"
  | "grid"
  | "dots"
  | "waves"
  | "diagonal"
  | "mesh"
  | "noise"
  | "aurora";

export type DeckTheme = {
  name: string;
  accent: string;
  font: DeckFont;
  pattern: DeckPattern;
  /** Optional slide canvas / text colors (hex). */
  canvas?: string;
  ink?: string;
};

export type Slide = {
  title: string;
  bullets: string[];
  note: string;
  layout: SlideLayout;
  image?: string;
  theme?: DeckTheme;
};

export const DEFAULT_THEME: DeckTheme = {
  name: "studio",
  accent: "#7C5CFF",
  font: "sans",
  pattern: "solid",
};

const NOTE = /^note\s*[:—–-]\s*(.+)$/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const LAYOUT = /^layout\s*[:—–-]\s*(title|bullets|split|photo|quote|section)\s*$/i;
const IMAGE = /^image\s*[:—–-]\s*(.+)$/i;

/** Full theme line: Theme: name | accent #hex | font X | pattern Y [| canvas #hex] [| ink #hex] */
const THEME_FULL =
  /^theme\s*[:—–-]\s*(.+?)\s*\|\s*accent\s*(#[0-9a-fA-F]{3,8})\s*\|\s*font\s*(sans|serif|display|mono|rounded)\s*\|\s*pattern\s*(solid|grid|dots|waves|diagonal|mesh|noise|aurora)(?:\s*\|\s*canvas\s*(#[0-9a-fA-F]{3,8}))?(?:\s*\|\s*ink\s*(#[0-9a-fA-F]{3,8}))?\s*$/i;

/** Looser: Theme: name | #accent | font | pattern */
const THEME_LOOSE =
  /^theme\s*[:—–-]\s*(.+?)\s*\|\s*(#[0-9a-fA-F]{3,8})\s*\|\s*(sans|serif|display|mono|rounded)\s*\|\s*(solid|grid|dots|waves|diagonal|mesh|noise|aurora)\s*$/i;

const LAYOUTS = new Set<SlideLayout>([
  "title",
  "bullets",
  "split",
  "photo",
  "quote",
  "section",
]);

const FONTS = new Set<DeckFont>(["sans", "serif", "display", "mono", "rounded"]);
const PATTERNS = new Set<DeckPattern>([
  "solid",
  "grid",
  "dots",
  "waves",
  "diagonal",
  "mesh",
  "noise",
  "aurora",
]);

function clean(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\s)([^*]+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

function stripSlideLabel(s: string): string {
  return s.replace(/^slide\s*\d+\s*[—–:.-]?\s*/i, "").trim();
}

function blank(title = ""): Slide {
  return { title, bullets: [], note: "", layout: "bullets" };
}

function finalize(slide: Slide): Slide {
  if (!slide.layout || slide.layout === "bullets") {
    if (!slide.bullets.length && slide.title) {
      return { ...slide, layout: "title" };
    }
  }
  if (slide.image && slide.layout === "bullets") {
    return { ...slide, layout: "split" };
  }
  return slide;
}

function parseThemeLine(plain: string): DeckTheme | null {
  const full = plain.match(THEME_FULL);
  if (full) {
    return {
      name: full[1].trim() || "custom",
      accent: full[2],
      font: full[3].toLowerCase() as DeckFont,
      pattern: full[4].toLowerCase() as DeckPattern,
      canvas: full[5] || undefined,
      ink: full[6] || undefined,
    };
  }
  const loose = plain.match(THEME_LOOSE);
  if (loose) {
    return {
      name: loose[1].trim() || "custom",
      accent: loose[2],
      font: loose[3].toLowerCase() as DeckFont,
      pattern: loose[4].toLowerCase() as DeckPattern,
    };
  }
  return null;
}

export function parseDeck(markdown: string): Slide[] {
  const slides: Slide[] = [];
  let current: Slide | null = null;
  let firstHeading = true;
  let deckTheme: DeckTheme | undefined;

  const push = () => {
    if (current && (current.title || current.bullets.length)) {
      if (deckTheme) current.theme = deckTheme;
      slides.push(finalize(current));
    }
  };

  let inCode = false;

  for (const raw of markdown.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const plain = clean(line);
    if (!plain) continue;

    const theme = parseThemeLine(plain);
    if (theme) {
      deckTheme = theme;
      continue;
    }

    const h = plain.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      const title = stripSlideLabel(h[1]);
      if (firstHeading && !current) {
        firstHeading = false;
        current = blank(title);
        current.layout = "title";
        continue;
      }
      push();
      current = blank(title);
      firstHeading = false;
      continue;
    }

    if (!current) {
      // No slide open yet and this isn't a heading, theme, or directive:
      // it's conversational framing ("Okay, here's your deck…"). Drop it
      // rather than turning it into a phantom first slide (QA-07).
      continue;
    }

    const layoutMatch = plain.match(LAYOUT);
    if (layoutMatch && LAYOUTS.has(layoutMatch[1].toLowerCase() as SlideLayout)) {
      current.layout = layoutMatch[1].toLowerCase() as SlideLayout;
      continue;
    }

    const imageMatch = plain.match(IMAGE);
    if (imageMatch) {
      current.image = imageMatch[1].trim();
      continue;
    }

    const noteMatch = plain.match(NOTE);
    if (noteMatch) {
      current.note = noteMatch[1].trim();
      continue;
    }

    const bulletMatch = plain.match(BULLET);
    if (bulletMatch) {
      current.bullets.push(bulletMatch[1].trim());
      continue;
    }

    if (!/^(theme|layout|image|note)\s*[:—–-]/i.test(plain)) {
      current.bullets.push(plain);
    }
  }

  push();
  return slides;
}

/* --------------------- generation validation (QA-07) --------------------- */

/**
 * Strip conversational framing before the first real slide. The deck format
 * starts with a `# ` title heading, so anything before the first heading —
 * "Okay, here's your deck…", "I will also…" — is preamble, not content.
 * Structural Theme lines hiding in the preamble are preserved.
 */
export function stripDeckPreamble(markdown: string): string {
  const lines = markdown.split("\n");
  let inCode = false;
  let firstHeading = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^```/.test(t)) {
      inCode = !inCode;
      continue;
    }
    if (!inCode && /^#{1,3}\s+\S/.test(t)) {
      firstHeading = i;
      break;
    }
  }
  if (firstHeading <= 0) return markdown;
  const kept: string[] = [];
  for (let i = 0; i < firstHeading; i++) {
    if (parseThemeLine(clean(lines[i]))) kept.push(lines[i]);
  }
  return [...kept, ...lines.slice(firstHeading)].join("\n");
}

export interface DeckRequirements {
  /** Exact total slides requested (incl. title slide), or the upper bound of a range. */
  slideCount: number | null;
  /** Lower bound when the user gave a range like "8-12 slides". */
  minSlides: number | null;
  /** Verbatim tokens (e.g. "END-QA-DECK") that must appear in the final deck. */
  markers: string[];
}

/**
 * Read structured requirements out of the user's prompt:
 * - an exact slide count ("exactly 5 slides", "a 5-slide deck", "5 slides")
 *   or a range ("8–12 slides" → min 8, max 12);
 * - required verbatim markers: quoted ALL-CAPS tokens, or dashed ALL-CAPS
 *   tokens like END-QA-DECK.
 */
export function extractDeckRequirements(prompt: string): DeckRequirements {
  const text = prompt.replace(/\s+/g, " ");
  let slideCount: number | null = null;
  let minSlides: number | null = null;

  const range = text.match(/(\d+)\s*(?:-|–|—|\bto\b)\s*(\d+)\s*-?\s*slides?\b/i);
  if (range) {
    minSlides = parseInt(range[1], 10);
    slideCount = parseInt(range[2], 10);
    if (minSlides > slideCount) [minSlides, slideCount] = [slideCount, minSlides];
  } else {
    const exact =
      text.match(/exactly\s+(\d+)\s*-?\s*slides?\b/i) ||
      text.match(/(\d+)\s*-\s*slides?\b/i) ||
      text.match(/(\d+)\s+slides?\b/i);
    if (exact) {
      slideCount = parseInt(exact[1], 10);
      minSlides = slideCount;
    }
  }

  const markers = new Set<string>();
  for (const m of text.matchAll(/["'`]([A-Z0-9][A-Z0-9_.-]{2,})["'`]/g)) {
    markers.add(m[1]);
  }
  for (const m of text.matchAll(/\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,4})\b/g)) {
    markers.add(m[1]);
  }
  return { slideCount, minSlides, markers: [...markers] };
}

export interface DeckIssue {
  kind: "count" | "marker";
  message: string;
}

/**
 * Validate parsed slides against the user's requirements. Returns issues;
 * the caller decides which ones block saving.
 */
export function validateDeck(slides: Slide[], req: DeckRequirements): DeckIssue[] {
  const issues: DeckIssue[] = [];
  if (req.slideCount != null && slides.length > req.slideCount) {
    issues.push({
      kind: "count",
      message: `You asked for ${req.slideCount} slides but the draft came back with ${slides.length}.`,
    });
  }
  const min = req.minSlides ?? req.slideCount;
  if (min != null && slides.length < min) {
    const want =
      req.minSlides != null && req.minSlides !== req.slideCount
        ? `${req.minSlides}–${req.slideCount}`
        : String(min);
    issues.push({
      kind: "count",
      message: `You asked for ${want} slides but only ${slides.length} came back. Try again or add slides manually.`,
    });
  }
  if (req.markers.length) {
    const text = serializeDeck(slides);
    for (const marker of req.markers) {
      if (!text.includes(marker)) {
        issues.push({
          kind: "marker",
          message: `Required text "${marker}" is missing from the generated deck.`,
        });
      }
    }
  }
  return issues;
}

/**
 * Trim extras down to the requested count. "Too few" is left for
 * validateDeck to report as a mismatch — slides are never invented.
 */
export function enforceSlideCount(slides: Slide[], req: DeckRequirements): Slide[] {
  if (req.slideCount != null && slides.length > req.slideCount) {
    return slides.slice(0, req.slideCount);
  }
  return slides;
}

/** Image briefs that carry no real visual information. */
const DEGENERATE_BRIEF = /^(photo|visual panel|image|picture|illustration|placeholder|n\/?a|none|tbd)\b/i;

/**
 * Drop photo/split frames that have no real image prompt. A PhotoFrame with
 * a degenerate brief renders as a "PHOTO / Visual panel" placeholder, which
 * reads as content — so demote the slide to a text layout instead and the
 * slot simply isn't there. This aligns generation with PhotoFrame's
 * contract: it only ever receives real briefs or real URLs.
 */
export function sanitizeDeckImages(slides: Slide[]): Slide[] {
  return slides.map((s) => {
    if (s.layout !== "photo" && s.layout !== "split") return s;
    const brief = (s.image ?? "").trim();
    if (brief && !DEGENERATE_BRIEF.test(brief)) return s;
    return {
      ...s,
      image: undefined,
      layout: (s.bullets.length ? "bullets" : "title") as SlideLayout,
    };
  });
}

export function serializeDeck(slides: Slide[], theme?: DeckTheme): string {
  const t = theme || slides[0]?.theme || DEFAULT_THEME;
  const out: string[] = [];
  if (slides[0]?.title) out.push(`# ${slides[0].title}`);
  out.push(
    `Theme: ${t.name} | accent ${t.accent} | font ${t.font} | pattern ${t.pattern}` +
      (t.canvas ? ` | canvas ${t.canvas}` : "") +
      (t.ink ? ` | ink ${t.ink}` : ""),
  );
  out.push("");

  slides.forEach((s, i) => {
    if (!(i === 0 && s.layout === "title" && !s.bullets.length)) {
      out.push(`## Slide ${i + 1} — ${s.title || `Slide ${i + 1}`}`);
    }
    if (s.layout && s.layout !== "bullets") {
      out.push(`Layout: ${s.layout}`);
    }
    if (s.image) out.push(`Image: ${s.image}`);
    for (const b of s.bullets) out.push(`- ${b}`);
    if (s.note) out.push(`Note: ${s.note}`);
    out.push("");
  });
  return out.join("\n").trim() + "\n";
}

/** British spelling alias used by studio views. */
export const serialiseDeck = serializeDeck;

export function deckFilename(slides: Slide[], fallback: string): string {
  const base = slides[0]?.title || fallback || "deck";
  return (
    base
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "deck"
  );
}

export function resolveSlideImage(image?: string): string | undefined {
  if (!image) return undefined;
  const s = image.trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:image/")) return s;
  const prompt = encodeURIComponent(
    `${s.slice(0, 220)}, professional photography, high detail, cinematic lighting, sharp focus`,
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=1920&height=1080&nologo=true&enhance=true&seed=${hashSeed(s)}`;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 1_000_000;
}

/** Resolve Image: briefs to URLs; fill missing photos for photo/split/odd slides. */
export function enrichDeckImages(slides: Slide[]): Slide[] {
  return slides.map((slide, i) => {
    const brief =
      slide.image ||
      [slide.title, slide.bullets[0], slide.bullets[1]].filter(Boolean).join(", ") ||
      `unique presentation visual ${i + 1}`;
    const image =
      resolveSlideImage(slide.image) ??
      (slide.layout === "photo" ||
      slide.layout === "split" ||
      slide.layout === "title" ||
      i % 2 === 1
        ? resolveSlideImage(brief)
        : undefined);
    if (!image) return slide;
    let layout = slide.layout;
    if (layout === "bullets" && image) layout = "split";
    return { ...slide, image, layout };
  });
}

/** CSS font-family for a deck font token. */
export function fontFamilyFor(font: DeckFont | undefined): string {
  switch (font) {
    case "serif":
      return 'Georgia, "Times New Roman", "Liberation Serif", serif';
    case "display":
      return '"Segoe UI Display", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
    case "mono":
      return 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace';
    case "rounded":
      return '"Nunito", "Segoe UI Rounded", "SF Pro Rounded", system-ui, sans-serif';
    case "sans":
    default:
      return 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
  }
}

/** Background layers for deck pattern tokens. */
export function patternBackground(
  pattern: DeckPattern | undefined,
  accent: string,
  canvas?: string,
): string {
  const base = canvas || "var(--color-raised, #0f0f14)";
  const a = accent || "#7C5CFF";
  switch (pattern) {
    case "grid":
      return `linear-gradient(to right, color-mix(in oklab, ${a} 14%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, ${a} 14%, transparent) 1px, transparent 1px), ${base}`;
    case "dots":
      return `radial-gradient(circle at 1px 1px, color-mix(in oklab, ${a} 22%, transparent) 1px, transparent 0), ${base}`;
    case "waves":
      return `repeating-linear-gradient(120deg, color-mix(in oklab, ${a} 10%, transparent) 0 12px, transparent 12px 28px), ${base}`;
    case "diagonal":
      return `repeating-linear-gradient(-35deg, color-mix(in oklab, ${a} 12%, transparent) 0 10px, transparent 10px 22px), ${base}`;
    case "mesh":
      return `radial-gradient(at 20% 20%, color-mix(in oklab, ${a} 28%, transparent), transparent 50%), radial-gradient(at 80% 0%, color-mix(in oklab, ${a} 18%, transparent), transparent 45%), radial-gradient(at 50% 100%, color-mix(in oklab, ${a} 14%, transparent), transparent 50%), ${base}`;
    case "noise":
      return `radial-gradient(circle at 30% 40%, color-mix(in oklab, ${a} 16%, transparent), transparent 55%), radial-gradient(circle at 70% 70%, color-mix(in oklab, ${a} 10%, transparent), transparent 50%), ${base}`;
    case "aurora":
      return `linear-gradient(135deg, color-mix(in oklab, ${a} 32%, transparent), transparent 55%), linear-gradient(225deg, color-mix(in oklab, ${a} 18%, #22d3ee) 0%, transparent 50%), ${base}`;
    case "solid":
    default:
      return canvas
        ? canvas
        : `radial-gradient(circle at 100% 0%, color-mix(in oklab, ${a} 22%, transparent), transparent 62%), ${base}`;
  }
}

export function isDeckFont(v: string): v is DeckFont {
  return FONTS.has(v as DeckFont);
}

export function isDeckPattern(v: string): v is DeckPattern {
  return PATTERNS.has(v as DeckPattern);
}
