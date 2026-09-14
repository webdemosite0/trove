/**
 * Deck model + lenient markdown parser.
 *
 * One type system for text (title + body). Layouts vary; typography does not.
 */

export type SlideLayout =
  | "title"
  | "bullets"
  | "split"
  | "photo"
  | "quote"
  | "section";

export type Slide = {
  title: string;
  bullets: string[];
  note: string;
  /** Visual structure. Default "bullets". */
  layout: SlideLayout;
  /**
   * Optional image URL or a short photo brief the UI can show as a placeholder.
   * Models write: Image: <url or description>
   */
  image?: string;
};

const NOTE = /^note\s*[:—–-]\s*(.+)$/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const LAYOUT = /^layout\s*[:—–-]\s*(title|bullets|split|photo|quote|section)\s*$/i;
const IMAGE = /^image\s*[:—–-]\s*(.+)$/i;

const LAYOUTS = new Set<SlideLayout>([
  "title",
  "bullets",
  "split",
  "photo",
  "quote",
  "section",
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

export function parseDeck(markdown: string): Slide[] {
  const slides: Slide[] = [];
  let current: Slide | null = null;
  let firstHeading = true;

  const push = () => {
    if (current && (current.title || current.bullets.length)) {
      slides.push(finalize(current));
    }
  };

  let inCode = false;

  for (const raw of markdown.split("\n")) {
    if (/^\s*```/.test(raw)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      if (current && raw.trim()) current.bullets.push(raw.trim());
      continue;
    }

    const heading = raw.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const title = stripSlideLabel(clean(heading[2]));
      if (heading[1].length === 1 && firstHeading && !slides.length && !current) {
        firstHeading = false;
        current = blank(title);
        current.layout = "title";
        continue;
      }
      firstHeading = false;
      push();
      current = blank(title);
      continue;
    }

    const plain = clean(raw);
    if (!plain) continue;

    const layoutMatch = plain.match(LAYOUT);
    if (layoutMatch && current) {
      const l = layoutMatch[1].toLowerCase() as SlideLayout;
      if (LAYOUTS.has(l)) current.layout = l;
      continue;
    }

    const imageMatch = plain.match(IMAGE);
    if (imageMatch && current) {
      current.image = imageMatch[1].trim();
      if (current.layout === "bullets") current.layout = "split";
      continue;
    }

    const bullet = raw.match(BULLET);

    if (!current) {
      if (!bullet) continue;
      current = blank("");
    }

    const note = plain.match(NOTE);
    if (note) {
      current.note = current.note ? `${current.note} ${note[1]}` : note[1];
      continue;
    }

    if (bullet) {
      const text = clean(bullet[1]);
      if (text) current.bullets.push(text);
      continue;
    }

    if (plain) current.bullets.push(plain);
  }

  push();
  return slides;
}

export function serialiseDeck(slides: Slide[]): string {
  if (!slides.length) return "";
  const out: string[] = [];
  slides.forEach((s, i) => {
    if (i === 0 && s.layout === "title" && !s.bullets.length) {
      out.push(`# ${s.title || "Untitled deck"}`, "");
    } else {
      out.push(`## Slide ${i + 1} — ${s.title || "Untitled"}`, "");
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
