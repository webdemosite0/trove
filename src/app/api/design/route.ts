import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { saveDesignScreen } from "@/lib/design-saves";
import {
  FIDELITIES,
  PLATFORMS,
  screenPrompt,
  updateScreenPrompt,
  type Brief,
  type Fidelity,
  type Platform,
} from "@/lib/design-brief";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are Trove's interface designer, and you design by building.

You return a working HTML document, never a description of one. A written spec
is something a person then has to draw; a rendered screen is the design.

What separates your work from a template:
- Real content. Actual product names, plausible numbers, copy someone would
  write. "Lorem ipsum" and "Card title" are the sound of a design nobody
  thought about.
- Deliberate spacing. Pick a rhythm and hold it. Uneven gaps read as broken
  before anyone can say why.
- One clear focal point per screen, and a hierarchy under it that a person can
  follow without reading every word.
- States that exist. Empty, loading and error are part of the design, not
  something to add later — if a screen has a list, decide what it looks like
  with nothing in it.

BRAND + THEME CONSISTENCY (critical for multi-screen projects)
- One product name and one logo mark for the whole set. Same SVG geometry,
  same wordmark spelling, same placement language (header / tab / splash).
- Shared :root design tokens (--bg, --surface, --text, --muted, --accent,
  --accent-text, --line, --radius, --shadow) used everywhere instead of
  one-off colours that drift between screens.
- Navigation mirrors the screen list and highlights the current screen.

WORKING CONTROLS
- Icons are inline SVG inside real buttons/links — not decorative orphans.
- Hover, active, and focus states on interactive elements.
- Tabs, toggles, and menus must change visible state.

You never reference an external asset. Every icon is inline SVG, every colour
is a token or literal value, every font is a system stack. The document renders
with no network, or it renders as a blank rectangle.`;

/** Rejects a value the client made up, rather than trusting the body. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * The model wraps HTML in a markdown fence about half the time, whatever the
 * prompt says. Stripping it here is one line; asking for it and being
 * disappointed is a blank preview.
 */
function unwrap(text: string): string {
  const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();

  // Anything before <!DOCTYPE or <html is commentary the model added anyway.
  const start = body.search(/<!DOCTYPE html|<html[\s>]/i);
  return start > 0 ? body.slice(start) : body;
}

export async function POST(req: NextRequest) {
  let brief: Brief;
  let screen = "";
  let timeZone = "UTC";
  let instruction = "";
  let previousHtml = "";
  let priorThemeHint = "";

  try {
    const body = await req.json();
    screen = String(body?.screen ?? "").slice(0, 80);
    timeZone = safeTimeZone(body?.timeZone);
    instruction = String(body?.instruction ?? "").slice(0, 800);
    previousHtml = String(body?.previousHtml ?? "").slice(0, 32000);
    priorThemeHint = String(body?.priorThemeHint ?? "").slice(0, 1200);

    const raw = body?.brief ?? {};
    brief = {
      what: String(raw.what ?? "").slice(0, 400),
      platform: oneOf<Platform>(raw.platform, PLATFORMS, "Mobile"),
      fidelity: oneOf<Fidelity>(raw.fidelity, FIDELITIES, "Polished"),
      screens: Array.isArray(raw.screens) ? raw.screens.slice(0, 12).map(String) : [],
      style: String(raw.style ?? "").slice(0, 300),
    } as Brief;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!screen) {
    return Response.json({ error: "No screen was requested." }, { status: 400 });
  }

  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    throw e;
  }

  try {
    const userPrompt =
      instruction && previousHtml
        ? updateScreenPrompt(brief, screen, instruction, previousHtml)
        : screenPrompt(brief, screen, priorThemeHint || undefined);

    const html = await generateText({
      system: [SYSTEM, OBEY_FORMAT, situation({ timeZone, canSearch: false })].join("\n\n"),
      turns: [{ role: "user", text: userPrompt }],
      // Low. A screen is a considered layout, not a brainstorm, and a high
      // temperature here produces novelty in places nobody wanted it.
      temperature: 0.4,
      // A full screen with inline SVG is long. Truncation renders as a
      // half-drawn page, which looks like a bug rather than a limit.
      maxOutputTokens: 8192,
      onUsage: (u) => account && spend(account.userId, "design", u.totalTokens),
    });

    const doc = unwrap(html);
    if (!/<html[\s>]/i.test(doc)) {
      return Response.json(
        { error: "The model did not return a page. Try again." },
        { status: 502 },
      );
    }

    // Designs are real saved work, just like chats/docs/decks. Saving is
    // best-effort so a database hiccup never hides a screen the model already built.
    const savedId = await saveDesignScreen(brief, screen, doc).catch((error) => {
      console.error(
        "design save",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    });

    return Response.json({ screen, html: doc, id: savedId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("design route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
