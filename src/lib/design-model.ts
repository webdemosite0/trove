/**
 * Client-safe design model: types, canvas sizes, and layer sanitization.
 * No server imports — safe to use from Client Components.
 * Server CRUD lives in `@/lib/design-docs` (re-exports everything here).
 */

/* ── Canvas sizes (design pixels) ─────────────────────────────── */

export interface CanvasSize {
  id: string;
  label: string;
  category: string;
  w: number;
  h: number;
}

export const CANVAS_SIZES: CanvasSize[] = [
  { id: "ig-post", label: "Instagram Post", category: "social", w: 1080, h: 1080 },
  { id: "ig-story", label: "Instagram Story", category: "social", w: 1080, h: 1920 },
  { id: "poster", label: "Poster", category: "poster", w: 1080, h: 1350 },
  { id: "logo", label: "Logo", category: "logo", w: 1000, h: 1000 },
  { id: "yt-thumb", label: "YouTube Thumbnail", category: "thumbnail", w: 1280, h: 720 },
  { id: "fb-cover", label: "Facebook Cover", category: "social", w: 1640, h: 924 },
];

export const DESIGN_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "poster", label: "Posters" },
  { id: "logo", label: "Logos" },
  { id: "thumbnail", label: "Thumbnails" },
  { id: "custom", label: "Custom" },
] as const;

export function sizeById(id: string): CanvasSize {
  return CANVAS_SIZES.find((s) => s.id === id) ?? CANVAS_SIZES[0]!;
}

/* ── Layers ───────────────────────────────────────────────────── */

export interface TextLayer {
  id: string;
  kind: "text";
  x: number; // center
  y: number; // center
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  align: "left" | "center" | "right";
  bold: boolean;
  rotation: number;
}

export interface RectLayer {
  id: string;
  kind: "rect";
  x: number; // center
  y: number; // center
  w: number;
  h: number;
  fill: string;
  radius: number;
  rotation: number;
}

export interface CircleLayer {
  id: string;
  kind: "circle";
  x: number; // center
  y: number; // center
  r: number;
  fill: string;
  rotation: number;
}

export type Layer = TextLayer | RectLayer | CircleLayer;

export const FONT_FAMILIES = [
  "Inter, system-ui, sans-serif",
  "Georgia, serif",
  "Impact, sans-serif",
  "Courier New, monospace",
  "Comic Sans MS, cursive",
  "Arial Black, sans-serif",
] as const;

const MAX_LAYERS = 120;

function clientUid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

export function cleanColor(v: unknown, fallback: string): string {
  if (typeof v === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(v.trim())) {
    return v.trim().slice(0, 9);
  }
  return fallback;
}

/** Validate + normalize a raw layers array from the client or AI. */
export function sanitizeLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw)) return [];
  const out: Layer[] = [];
  for (const item of raw.slice(0, MAX_LAYERS)) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, unknown>;
    const id = typeof l.id === "string" && l.id ? l.id.slice(0, 40) : clientUid("lyr");
    const x = clampNum(l.x, -4000, 8000, 540);
    const y = clampNum(l.y, -4000, 8000, 540);
    const rotation = clampNum(l.rotation, -180, 180, 0);
    if (l.kind === "text") {
      const text = typeof l.text === "string" ? l.text.slice(0, 500) : "Text";
      const fontFamily =
        typeof l.fontFamily === "string" && (FONT_FAMILIES as readonly string[]).includes(l.fontFamily)
          ? l.fontFamily
          : FONT_FAMILIES[0]!;
      out.push({
        id,
        kind: "text",
        x,
        y,
        text,
        fontSize: clampNum(l.fontSize, 8, 600, 72),
        color: cleanColor(l.color, "#111111"),
        fontFamily,
        align: l.align === "left" || l.align === "right" ? l.align : "center",
        bold: l.bold === true,
        rotation,
      });
    } else if (l.kind === "rect") {
      out.push({
        id,
        kind: "rect",
        x,
        y,
        w: clampNum(l.w, 4, 8000, 400),
        h: clampNum(l.h, 4, 8000, 200),
        fill: cleanColor(l.fill, "#8b5cf6"),
        radius: clampNum(l.radius, 0, 2000, 24),
        rotation,
      });
    } else if (l.kind === "circle") {
      out.push({
        id,
        kind: "circle",
        x,
        y,
        r: clampNum(l.r, 2, 4000, 120),
        fill: cleanColor(l.fill, "#3b82f6"),
        rotation,
      });
    }
  }
  return out;
}

/* ── Doc shape (also used by the server lib) ──────────────────── */

export interface DesignDoc {
  id: string;
  name: string;
  category: string;
  sizeId: string;
  layers: Layer[];
  background: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
}

export interface DesignDocInput {
  name?: string;
  category?: string;
  sizeId?: string;
  layers?: unknown;
  background?: string;
  thumbnail?: string;
}
