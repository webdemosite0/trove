/**
 * The questions asked before a design is made, and the prompt they build.
 *
 * The design tool used to take a sentence and answer with a written spec. A
 * sentence is not enough to design from — "make a UI for an app" leaves the
 * platform, the screens and the fidelity all unstated, so the model picks
 * silently and is wrong about at least one of them.
 *
 * Asking first is cheaper than regenerating. Every field here changes what
 * gets built, and every one can be skipped: an unanswered question becomes a
 * stated default in the prompt rather than a blank the model has to guess at.
 *
 * Pure and dependency-free, so the prompt can be tested without a model.
 */

export const PLATFORMS = ["Mobile", "Desktop web", "Tablet"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FIDELITIES = ["Wireframe", "Polished", "Clickable prototype"] as const;
export type Fidelity = (typeof FIDELITIES)[number];

export const SCREENS = [
  "Home / feed",
  "Onboarding",
  "Detail view",
  "List / browse",
  "Search",
  "Profile",
  "Settings",
  "Create / add flow",
  "Dashboard with data",
] as const;
export type ScreenName = (typeof SCREENS)[number];

export interface Brief {
  /** What the app is and who it is for. */
  what: string;
  platform: Platform;
  screens: ScreenName[];
  fidelity: Fidelity;
  /** Notes on an existing look to match, or a system to follow. */
  style: string;
}

export const EMPTY_BRIEF: Brief = {
  what: "",
  platform: "Mobile",
  screens: ["Home / feed"],
  fidelity: "Polished",
  style: "",
};

/** The viewport each platform is designed against. */
export const FRAME: Record<Platform, { width: number; height: number; label: string }> = {
  Mobile: { width: 390, height: 844, label: "390 × 844" },
  Tablet: { width: 834, height: 1112, label: "834 × 1112" },
  "Desktop web": { width: 1280, height: 900, label: "1280 × 900" },
};

/**
 * How much visual finish to ask for.
 *
 * Split out because it is the field people most often get wrong by omission:
 * a wireframe rendered in full colour is not a wireframe, and a polished
 * screen drawn in grey boxes is not worth looking at.
 */
const FIDELITY_RULES: Record<Fidelity, string> = {
  Wireframe:
    "Wireframe fidelity. Greyscale only — no brand colour, no photography, no " +
    "gradients. Boxes with labels where images would go. The point is layout " +
    "and hierarchy, so spend the effort on spacing and proportion.",
  Polished:
    "Production fidelity. Real colour, real type, real spacing, real copy — no " +
    "lorem ipsum and no placeholder rectangles. It should look like a screenshot " +
    "of a shipped product, not a mockup of one.",
  "Clickable prototype":
    "Production fidelity, and interactive. Buttons, tabs and inputs respond: use " +
    "CSS :hover and :active throughout, and a small amount of vanilla JavaScript " +
    "where a control genuinely changes state — tabs that switch, a menu that " +
    "opens. No framework, no build step.",
};

export function brandNameFromBrief(what: string): string {
  const text = what.trim() || "App";
  const quoted = text.match(/["“]([^"”]{2,40})["”]/);
  if (quoted) return quoted[1].trim();
  const titled = text.match(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\b/);
  if (titled && titled[1].length >= 3 && titled[1].toLowerCase() !== "the") return titled[1];
  const first = text.split(/[.,:;!?]/)[0]?.trim().slice(0, 28);
  return first || "App";
}

/** Shared brand + theme rules so every screen in a set looks like one product. */
export function consistencyBlock(brief: Brief, screen: string): string {
  const brand = brandNameFromBrief(brief.what);
  const others = brief.screens.filter((s) => s !== screen).slice(0, 8);
  return [
    `PRODUCT BRAND (lock across the whole set)`,
    `- App name / wordmark text: "${brand}" — use this exact name on every screen.`,
    `- Logo: one simple geometric mark (inline SVG) + the wordmark "${brand}".`,
    `  The SAME mark shape, stroke weight, and color must appear on every screen`,
    `  (header, splash, or nav). Do not invent a different logo per screen.`,
    `- Theme tokens in :root — reuse these exact variable names on every screen:`,
    `  --bg, --surface, --text, --muted, --accent, --accent-text, --line, --radius, --shadow.`,
    `  Pick values once from the brief and keep them identical across screens.`,
    `- Typography: one display stack + one body stack (system fonts only). Same sizes rhythm.`,
    others.length
      ? `- Screen set: ${[screen, ...others].join(" · ")}. Nav labels must match these names.`
      : "",
    ``,
    `WORKING UI (not a static poster)`,
    `- Bottom tab bar or side nav with real destinations for the screens in this set.`,
    `  Highlight the current screen ("${screen}") with accent color / weight.`,
    `- Every icon is inline SVG and paired with a tappable/clickable control.`,
    `- Buttons, tabs, chips, and list rows use :hover / :active (and JS only if needed`,
    `  for tabs, toggles, or menus). Dead controls are a failed design.`,
    `- Primary actions do something visible (ripple, pressed state, sheet, toast).`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The instruction sent to the model for one screen.
 * One screen per request rather than a whole set in one.
 */
export function screenPrompt(brief: Brief, screen: string, priorThemeHint?: string): string {
  const frame = FRAME[brief.platform];

  return [
    `Design the "${screen}" screen as a finished product surface.`,
    "",
    `The product: ${brief.what.trim() || "a general-purpose consumer app"}`,
    `Platform: ${brief.platform}, designed at ${frame.width}×${frame.height}.`,
    "",
    FIDELITY_RULES[brief.fidelity],
    brief.style.trim() ? `\nVisual direction: ${brief.style.trim()}` : "",
    "",
    consistencyBlock(brief, screen),
    priorThemeHint
      ? `\nTheme continuity from earlier screens in this project:\n${priorThemeHint}\nMatch these colors and the logo mark exactly.`
      : "",
    "",
    "Return ONE complete HTML document and nothing else — no explanation, no",
    "markdown fence. It must:",
    "",
    `- open with <!DOCTYPE html> and set the viewport to ${frame.width}px wide`,
    "- carry all CSS in a single <style> block; no external stylesheets or fonts",
    "- define :root theme tokens listed above and use them (no random one-off hex for brand)",
    "- draw every icon as inline SVG; never reference an icon font or an image URL",
    "- include the brand logo mark + wordmark in the chrome on this screen",
    "- fill the full height of the frame, with nothing cut off",
    "- use real, specific copy for this product — names, numbers, labels someone",
    "  would actually see, not 'Title' and 'Subtitle'",
    "",
    "It will be rendered in an iframe with no network access, so anything fetched",
    "from outside the document is a blank space where a design should be.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Follow-up edit of an existing screen HTML. */
export function updateScreenPrompt(
  brief: Brief,
  screen: string,
  instruction: string,
  html: string,
): string {
  return [
    `Update the "${screen}" screen for this product.`,
    `Product: ${brief.what.trim() || "app"}`,
    `Platform: ${brief.platform}.`,
    "",
    consistencyBlock(brief, screen),
    "",
    `Change requested: ${instruction.trim()}`,
    "",
    "Return ONE complete updated HTML document only (no markdown).",
    "Keep the same logo mark, brand name, and :root theme tokens unless the user asked to change them.",
    "Keep navigation working; highlight the current screen.",
    "",
    "Current HTML:",
    html.slice(0, 28000),
  ].join("\n");
}

/** A one-line summary of the brief, for the header and for saved history. */
export function briefSummary(brief: Brief): string {
  const what = brief.what.trim() || "Untitled app";
  return `${what} · ${brief.platform} · ${brief.screens.length} screen${
    brief.screens.length === 1 ? "" : "s"
  } · ${brief.fidelity}`;
}
