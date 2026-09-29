/**
 * Skills the builder can invoke.
 *
 * A skill is a real prompt module, not a label: when a build step declares one,
 * its `prompt` is appended to the system prompt for that step and genuinely
 * changes the code that comes out. The task feed shows which ones ran, so what
 * is on screen matches what actually happened.
 *
 * Anything that would need a server we do not have — provisioning a database,
 * sending mail, taking a payment — is deliberately absent. A skill that cannot
 * do the thing it names would be a lie told in a nice font.
 */

export type SkillId =
  | "ui-design"
  | "layout"
  | "content"
  | "login"
  | "store"
  | "image-upload"
  | "motion"
  | "seo"
  | "a11y"
  | "admin";

export interface Skill {
  id: SkillId;
  label: string;
  /** One line, shown in the picker and the task feed. */
  blurb: string;
  /** Appended to the system prompt when this skill runs. */
  prompt: string;
}

export const SKILLS: Record<SkillId, Skill> = {
  "ui-design": {
    id: "ui-design",
    label: "UI Design",
    blurb: "A design system: palette, type scale, spacing, states.",
    prompt: `DESIGN SYSTEM — do this before any markup.

Define these on :root and use them everywhere; never repeat a raw colour:
  --bg, --surface, --surface-2, --line, --ink, --ink-2, --ink-3,
  --accent, --accent-ink, --radius, --shadow, --max-width

Type scale: exactly five sizes using clamp() so it is fluid, e.g.
  --fs-1: clamp(2rem, 5vw, 3.25rem)  down to  --fs-5: 0.8125rem
Set line-height 1.15 on headings and 1.6 on body.

TYPOGRAPHY — two distinct stacks (never one font for everything):
  --font-display: a distinctive heading stack (e.g. Georgia, "Times New Roman",
    "Iowan Old Style", serif OR "Segoe UI Display", system-ui, sans-serif —
    pick one that fits the mood; do NOT reuse the body stack)
  --font-body: a readable body stack different from display
    (e.g. system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)
Headings, nav brand, and hero titles use --font-display.
Body copy, forms, lists, and footer text use --font-body.
Never set a single font-family on body/html that everything inherits without
overriding headings.

Spacing: an 8px rhythm exposed as --sp-1 .. --sp-8. Never a magic number.

Every interactive element defines :hover, :active, :focus-visible and
:disabled. The focus ring is 2px, offset 2px, in --accent, and must be visible
against both --bg and --surface.

Contrast: body text at least 4.5:1 against the surface behind it, large text
at least 3:1. Muted text is the usual failure — check --ink-3 specifically.

Include a @media (prefers-reduced-motion: reduce) block that disables
transitions and animations.`,
  },

  layout: {
    id: "layout",
    label: "Layout",
    blurb: "Responsive structure down to 360px.",
    prompt: `LAYOUT.

Structure with grid and flexbox only — absolute positioning is for decoration,
never for the page skeleton.

A single content container: width min(100% - 2rem, var(--max-width)), centred
with margin-inline auto. Every section uses it, so the left edge of all text
lines up down the whole page.

PAGE CHROME — every page must include both:
  - <header> sticky or static: logo/wordmark, primary nav links to every
    page/view, and a primary CTA button
  - <footer>: brand blurb, 2–3 link columns (Product, Company, Legal),
    contact line, and copyright — not a single thin strip of three links

Long vertical rhythm: stack substantial <section> blocks (hero, social proof,
features, how-it-works, testimonials, pricing or menu, FAQ, final CTA). Each
section has padding of at least --sp-6 / --sp-7 so the page feels tall and
complete, not a single screen of sparse cards.

Responsive: usable at 360px with NO horizontal scroll anywhere. Prefer
grid-template-columns: repeat(auto-fit, minmax(Npx, 1fr)) over breakpoints so
it reflows without media queries. Where breakpoints are needed use min-width,
mobile first. On narrow screens the header collapses to a simple nav or menu
pattern; the footer stacks into columns.

Any element that can exceed its column — a table, a code block, a card row —
scrolls inside its own overflow-x:auto wrapper. The page body must never
scroll sideways.

Images: always width:100%, height:auto, display:block, and an explicit
aspect-ratio so nothing jumps as the page settles.`,
  },

  content: {
    id: "content",
    label: "Content",
    blurb: "Long, specific copy — never lorem or repeated lines.",
    prompt: `CONTENT — long, real, and varied.

Write FULL page copy for this specific business. Every major section needs
2–4 sentences of unique prose plus concrete details: product names, prices
with a consistent currency, opening hours, a plausible street address, staff
first names, believable review quotes, FAQ answers that actually answer.

LENGTH — do not ship thin pages:
  - Hero: headline + 2–3 sentence subcopy + primary and secondary CTA
  - Each feature/service card: title + 2–3 unique sentences (never the same
    sentence pattern with one word swapped)
  - Testimonials: 3 distinct quotes with name, role, and company
  - About / story: a full paragraph (80–120 words), not one line
  - FAQ: at least 4 Q&As with multi-sentence answers
  - Footer: brand blurb (2 sentences), link columns, contact line, legal line

Never lorem ipsum. Never "Your text here", "Lorem", "Product 1", "Feature 1",
or a grey box containing the word "image". Never a bracketed placeholder.
Never reuse the same sentence, tagline, or bullet wording on two sections.

Headlines say something concrete — "Roasted in small batches every Tuesday",
not "Welcome to our website". Buttons name their action — "Reserve a table",
not "Click here" or "Learn more" on every CTA (vary the labels).

Consistency: a price on the card matches the cart, the name in the header
matches the footer and <title>, and any count in prose matches items rendered.

Where an image belongs, use an inline SVG or a CSS gradient placeholder that
looks deliberate — never a broken external URL.`,
  },

  login: {
    id: "login",
    label: "Login",
    blurb: "Sign-in and sign-up screens, validated client-side.",
    prompt: `AUTH UI.

Build sign-in and sign-up as real forms with working client-side validation:
  - required fields flagged on blur, not only on submit
  - email checked for shape, password for a minimum length
  - errors rendered inline next to the field, wired with aria-describedby
  - the submit button disabled while the form is invalid
  - a single "signed in as X" state in the header once accepted

Session state lives in localStorage under one namespaced key, and the header
reflects it on load so a refresh does not appear to sign the user out.`,
  },

  store: {
    id: "store",
    label: "Client store",
    blurb: "Shared state module for cart, records, filters.",
    prompt: `STORE.

One module owns the data. Views only read and write through it — never their
own copy of the list, or they drift the moment one of them mutates.

Export load, save, list, get, add, update, remove. Persist to localStorage
under one namespaced key. Guard JSON.parse. Seed with realistic starter rows
when empty.`,
  },

  "image-upload": {
    id: "image-upload",
    label: "Image upload",
    blurb: "Client-side image pick with preview and size limits.",
    prompt: `IMAGE UPLOAD.

File input accepting image/*, preview via FileReader data URL, reject over 2MB
with a visible message, handle reader errors. Store the data URL on the record
through the store module.`,
  },

  motion: {
    id: "motion",
    label: "Motion",
    blurb: "Subtle CSS transitions and open/close animations.",
    prompt: `MOTION.

CSS only. --ease, --fast (150ms), --med (250ms). Hover/focus on buttons and
cards. Prefer transform and opacity. Respect prefers-reduced-motion.`,
  },

  seo: {
    id: "seo",
    label: "SEO",
    blurb: "Titles, meta, landmarks, structured data.",
    prompt: `SEO.

Unique title and meta description per page. Viewport, lang, theme-color, OG
tags. One h1 per page, ordered headings, landmarks (header, nav, main, footer).
JSON-LD matching the business. Meaningful link text; alt on images.`,
  },

  a11y: {
    id: "a11y",
    label: "Accessibility",
    blurb: "Keyboard reachable, labelled, announced.",
    prompt: `ACCESSIBILITY.

Tab order sensible, visible focus-visible, skip link, labels on inputs,
aria-expanded on menus, aria-live for dynamic updates. Touch targets 44px.`,
  },

  admin: {
    id: "admin",
    label: "Admin Panel",
    blurb: "A private screen to manage the underlying records.",
    prompt: `ADMIN.

Table of records with add, edit, delete. Shared form, validation, confirm on
delete, empty state. Reads/writes only through the store module.`,
  },
};

export const SKILL_LIST = Object.values(SKILLS);

export function skillPrompts(ids: string[]): string {
  const parts: string[] = [];
  for (const id of ids) {
    const s = SKILLS[id as SkillId];
    if (s) parts.push(s.prompt);
  }
  return parts.join("\n\n");
}

export function skillLabel(id: string): string {
  return SKILLS[id as SkillId]?.label ?? id;
}
