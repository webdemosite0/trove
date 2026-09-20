import type { NextRequest } from "next/server";
import { streamText, type Source } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { lastUserText, readTurns, type Turn } from "@/lib/thread";

export const runtime = "nodejs";
export const maxDuration = 120;

export const TOOL_PROMPTS: Record<string, string> = {
  docs: `You are Trove's technical writer. Produce a complete, well-structured
document in markdown: a clear title, short intro, logical headings, and concrete
detail. No filler, no "in conclusion". Write the actual content the user asked
for, not a description of it.`,

  sheets: `You are Trove's data analyst. Return a markdown table as the main
output: a header row, correct alignment, and realistic, internally consistent
values. Add any formulas as a short list under the table using spreadsheet
syntax (e.g. =SUM(B2:B13)). Keep prose to two sentences at most.`,

  slides: `You are Trove's presentation designer. Every deck must feel unique.

UNIQUENESS (critical)
- Never reuse the same slide titles, bullet phrasing, or stock structure as a generic pitch deck.
- Invent a distinctive narrative arc for THIS topic only (e.g. story, problem→insight→proof, timeline, debate, case study, manifesto).
- Pick ONE visual pattern for the whole deck and stick to it. Patterns rotate across decks: cinematic photo essays, bold section chapters, split evidence panels, quote-led argument, data-story (still no tables — use short metric phrases), minimal manifesto, scrapbook photo + caption.
- Avoid clichés: "Key Features", "Our Solution", "Thank You", "Next Steps", "Agenda", "Overview", "Why Us", "The Problem" as generic labels unless the user used those exact words.
- Headings should be specific to the subject (e.g. "Latency under 40ms in Mumbai" not "Performance").
- Bullets: 3–5 max, under 12 words, no trailing period, concrete nouns and numbers when possible.

Format, exactly:
- First line after any theme block: "# " deck title (title slide, no bullets).
- Optional deck theme line (once, near the top):
  Theme: <name> | accent #<hex> | font sans|serif|display | pattern solid|grid|dots|waves|diagonal|mesh
  Example: Theme: midnight studio | accent #7C5CFF | font display | pattern mesh
- Then "## Slide N — Title" for each content slide.
- After each heading: Layout: title|bullets|split|photo|quote|section
- For split and photo slides ALWAYS add: Image: <concrete photo brief>
  Briefs describe a real scene/object/texture — never "illustration of X" or "abstract concept".
  Examples: "neon ramen stall reflection in rainy Tokyo alley", "cross-section of lithium cell under macro light", "hand holding cracked smartphone screen in sunlight"
- Bullets with "- " when the layout needs them.
- Speaker note: Note: one spoken sentence.

Layout mix (required):
- At least 40% of slides must be photo or split WITH Image: lines.
- Include at least one section or quote slide.
- Vary layouts — never more than two bullets-only slides in a row.

Length: 7–11 slides. No filler, no tables, no "Questions?".
When the user asks to change fonts, colors, or style in a follow-up, update the Theme: line and rewrite slide titles/copy to match — do not ignore theme requests.`,

  design: `You are Trove's product designer. Deliver a complete product UI concept in markdown:
clear hierarchy, screens as sections, and concrete copy. Prefer specifics over
framework lectures.`,

  websites: `You are Trove's website builder. Describe structure and copy the user
can ship: pages, sections, and key CTA wording. Be concrete.`,

  research: `You are Trove's researcher. Answer with sourced claims, uncertainty
where needed, and a tight structure. Prefer primary sources.`,
};

const SEARCHES = new Set(["research"]);

export async function POST(req: NextRequest) {
  let body: {
    tool?: string;
    prompt?: string;
    messages?: Turn[];
    attachments?: Attachment[];
    timeZone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tool = String(body.tool || "").trim();
  let messages = Array.isArray(body.messages) ? readTurns(body.messages) : [];
  let prompt = String(body.prompt || "").trim();
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const timeZone = safeTimeZone(body.timeZone);

  if (!messages.length && prompt) messages = [{ role: "user", text: prompt }];
  prompt = lastUserText(messages) || prompt;

  const system = TOOL_PROMPTS[tool];
  if (!system) return Response.json({ error: "Unknown tool." }, { status: 400 });
  if (prompt.length < 3 && attachments.length === 0) {
    return Response.json({ error: "Describe what you need." }, { status: 400 });
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
    const why = e instanceof Error ? e.message : String(e);
    console.error("tool: credit check failed —", why);
    return Response.json(
      { error: `Could not reach the database to check your credits: ${why}` },
      { status: 503 },
    );
  }

  const promptFor = (canSearch: boolean) =>
    [system, OBEY_FORMAT, situation({ timeZone, canSearch })].join("\n\n");

  try {
    let sources: Source[] = [];

    const isSlides = tool === "slides";
    const stream = await streamText({
      onUsage: (u) => account && spend(account.userId, tool, u.totalTokens),
      turns: messages.length
        ? messages
        : [{ role: "user", text: "Work from the attached files." }],
      system: promptFor(SEARCHES.has(tool)),
      systemWithoutSearch: promptFor(false),
      // Slides: high variety + OpenRouter first (Gemma when OPENROUTER_MODEL / SLIDES_MODEL / GEMMA_MODEL set)
      temperature: isSlides ? 1.05 : 0.75,
      maxOutputTokens: isSlides ? 6144 : 4096,
      preferredProvider: isSlides ? "openrouter" : undefined,
      extraParts: attachments.length ? toParts(attachments) : undefined,
      search: SEARCHES.has(tool),
      onSources: (s) => {
        sources = s;
      },
    });

    const withSources = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush(controller) {
          if (!sources.length) return;
          const lines = sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
          controller.enqueue(
            new TextEncoder().encode(`\n\n## Sources\n${lines}\n`),
          );
        },
      }),
    );

    return new Response(withSources, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("tool route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
