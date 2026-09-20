import type { NextRequest } from "next/server";
import { streamText, generateText, type Source } from "@/lib/ai";
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

  slides: `You are Trove's presentation designer. Produce a varied, visual deck.

UNIQUENESS: Do not reuse generic labels like "Key Features", "Our Solution",
"Thank You", or "Agenda". Titles and bullets must be specific to THIS topic.
Vary the narrative shape (story, timeline, case study, manifesto) and mix layouts.

Format, exactly:
- Start with "# " and the deck title on its own — title slide, no bullets.
- Optional once near the top:
  Theme: <name> | accent #<hex> | font sans|serif|display | pattern solid|grid|dots|waves|diagonal|mesh
- Then one "## Slide N — Title" per content slide.
- After the heading, optionally one line: Layout: title|bullets|split|photo|quote|section
- For most content slides add: Image: short concrete photo brief (what to show, not "illustration of…")
  Examples: "crowded trading floor at night", "electric vehicle on mountain road", "founder sketching on glass whiteboard"
- Then 3-5 bullets starting with "- " (skip bullets for title/section/quote when needed)
- Then a one-line speaker note: Note: ...

Layouts (mix them — do not use only bullets; at least half of the deck should be split or photo):
- title: opening / closing statement
- section: chapter break, big title only
- bullets: classic points (default)
- split: text left + Image photo panel right — always include Image:
- photo: full-bleed image with title bar — always include Image:
- quote: one strong line (+ optional attribution as second bullet)

Typography is one system only (the product applies a single text style).
Vary layout and imagery, not fonts. Bullets are phrases under 12 words, no
trailing full stop, specific. Aim for 7-10 slides. Include at least two
photo or split slides with Image: lines. No filler, no "Thank you", no tables.
When the user asks to change fonts or colors, update the Theme: line and copy.`,

  design: `You are Trove's product designer. Deliver a concrete UI design system.

Structure the answer as:
## Concept — one sentence product feeling
## Layout — structure, hierarchy, key screens
## Colour — 5–7 hex values with roles (canvas, ink, accent, etc.)
## Type — one type family, sizes and weights only (do not mix many faces)
## Spacing — base unit and common multiples
## Components — buttons, inputs, cards, states (hover/focus/disabled)
## Motion — 2–3 subtle interaction notes
## Responsive — mobile vs desktop behaviour

Be decisive. Pick values; do not offer alternatives. Prefer one cohesive
visual system over decorative variety.`,

  research: `You are Trove's research analyst. Structure the answer as: a
two-sentence summary, then "## Findings" with substantiated points, then
"## Open questions" listing what you could not determine.

You can search the web. Prefer what you find there to what you remember,
and say when a claim comes from a source rather than from prior knowledge.
Anything you could not verify belongs under Open questions rather than being
stated confidently. Never invent statistics, dates, or citations — the
sources you actually used are listed under your answer, so a citation that
is not among them is visibly wrong.`,

  code: `You are Trove's engineer. Lead with the code in a fenced block with the
correct language tag. It must be complete and runnable — no placeholders, no
"// implementation here". Follow with a short explanation of the important
decisions and any edge cases the caller must handle.`,
};

const SEARCHES = new Set(["research"]);

export async function POST(req: NextRequest) {
  let tool = "";
  let prompt = "";
  let messages: Turn[] = [];
  let attachments: Attachment[] = [];
  let timeZone = "UTC";
  try {
    const body = await req.json();
    tool = String(body?.tool ?? "");
    prompt = String(body?.prompt ?? "").trim();
    messages = readTurns(body);
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    timeZone = safeTimeZone(body?.timeZone);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!messages.length && prompt) messages = [{ role: "user", text: prompt }];
  prompt = lastUserText(messages) || prompt;

  const toolSystem = TOOL_PROMPTS[tool];
  if (!toolSystem) return Response.json({ error: "Unknown tool." }, { status: 400 });
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
    [toolSystem, OBEY_FORMAT, situation({ timeZone, canSearch })].join("\n\n");

  const turns =
    messages.length > 0
      ? messages
      : ([{ role: "user", text: "Work from the attached files." }] as Turn[]);
  const system = promptFor(SEARCHES.has(tool));
  const systemWithoutSearch = promptFor(false);
  const onUsage = (u: {
    totalTokens: number;
    promptTokens?: number;
    responseTokens?: number;
  }) => {
    if (!account) return;
    try {
      void spend(account.userId, tool, u.totalTokens);
    } catch (err) {
      console.warn("tool: spend failed —", err);
    }
  };

  try {
    let sources: Source[] = [];

    const stream = await streamText({
      onUsage,
      turns,
      system,
      systemWithoutSearch,
      temperature: 0.75,
      maxOutputTokens: 4096,
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
  } catch (streamErr) {
    console.error("tool route stream failed —", tool, streamErr);
    // Non-stream fallback when SSE path fails across providers
    try {
      const text = await generateText({
        onUsage,
        turns,
        system,
        systemWithoutSearch,
        temperature: 0.75,
        maxOutputTokens: 4096,
        extraParts: attachments.length ? toParts(attachments) : undefined,
        search: SEARCHES.has(tool),
      });
      if (!text?.trim()) {
        throw new Error("Empty model response");
      }
      return new Response(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("tool route generate failed —", tool, message);
      return Response.json(
        { error: "Trove could not finish this step. Please try again." },
        { status: 502 },
      );
    }
  }
}
