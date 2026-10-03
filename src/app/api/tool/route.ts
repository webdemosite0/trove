import type { NextRequest } from "next/server";
import { streamText, generateText, type Source } from "@/lib/ai";
import { slidesCompatProvider } from "@/lib/openai-compat";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { lastUserText, readTurns, type Turn } from "@/lib/thread";

export const runtime = "nodejs";
export const maxDuration = 120;

export const TOOL_PROMPTS: Record<string, string> = {
  docs: `You are Trove's technical writer. Produce a complete, well-structured
document in markdown: a clear title, short intro, logical headings, and concrete
detail. No filler, no "in conclusion". Write the actual content the user asked
for, not a description of it.`,

  sheets: `You are Trove's data analyst. Return ONLY a markdown table, nothing else.
Rules:
- First row is the header row, then a separator row (|---|---|), then data rows.
- Put formulas INLINE in the cells using spreadsheet syntax (e.g. =B2*C2, =SUM(B2:B5)). Never list formulas separately below the table.
- Use realistic, internally consistent values. Every formula must reference valid cells in the table.
- No prose, no explanations, no code fences — just the markdown table. Example:
| Item | Qty | Price | Total |
|------|-----|-------|-------|
| Apples | 10 | 2.5 | =B2*C2 |
| Oranges | 5 | 3 | =B3*C3 |
| Total |  |  | =SUM(D2:D3) |`,

  slides: `You are an elite presentation designer with full creative freedom.
Build a distinctive, visually rich deck for THIS topic — not a generic template.

UNIQUENESS: Never use stock labels like "Key Features", "Our Solution",
"Thank You", "Agenda", or "Overview". Every title and bullet must be specific.

YOU CHOOSE THE LOOK. Always emit a Theme line near the top and pick a bold palette:
  Theme: <mood name> | accent #<hex> | font <sans|serif|display|mono|rounded> | pattern <solid|grid|dots|waves|diagonal|mesh|noise|aurora> | canvas #<hex> | ink #<hex>
- accent, canvas, and ink must be real hex colors that contrast well together.
- Vary font across decks (serif for editorial, display for bold brands, mono for tech, rounded for friendly, sans for clean).
- Vary pattern and canvas — dark cinematic, light paper, aurora, mesh, etc. Do not default to purple every time.

Format, exactly:
- Start with "# " and the deck title (title slide).
- One Theme: line (required).
- Then "## Slide N — Title" for each content slide.
- After each heading you may set: Layout: title|bullets|split|photo|quote|section
- For most slides add a concrete Image: photo brief (what is in the frame — subject, setting, light).
  Good: "glass office at dusk, skyline bokeh, teal ambient light"
  Bad: "illustration of success"
- 3–5 bullets with "- " (skip for title/section/quote when needed)
- Optional Note: speaker line

Layouts (mix them — at least half split or photo):
- title / section / bullets / split / photo / quote

Aim for 8–12 slides. Short punchy bullets (under 12 words). No tables, no filler.
If the user asks for a style change, rewrite the Theme line and regenerate copy to match.`,

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
    return Response.json({ error: `Could not check credits: ${why}` }, { status: 503 });
  }

  if (account) {
    const limited = await expensiveRequestLimit({
      userId: account.userId,
      scope: "tool",
      limit: 40,
    });
    if (limited) return limited;
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

  const slidesProvider = tool === "slides" ? slidesCompatProvider() : null;
  const maxTokens = tool === "slides" ? 24576 : 4096;
  const preferred =
    tool === "slides" && slidesProvider ? slidesProvider.id : undefined;

  try {
    let sources: Source[] = [];

    const stream = await streamText({
      onUsage,
      turns,
      system,
      systemWithoutSearch,
      temperature: tool === "slides" ? 0.95 : 0.75,
      maxOutputTokens: maxTokens,
      extraParts: attachments.length ? toParts(attachments) : undefined,
      search: SEARCHES.has(tool),
      preferredProvider: preferred,
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
    try {
      const text = await generateText({
        onUsage,
        turns,
        system,
        systemWithoutSearch,
        temperature: tool === "slides" ? 0.95 : 0.75,
        maxOutputTokens: tool === "slides" ? 24576 : 4096,
        extraParts: attachments.length ? toParts(attachments) : undefined,
        search: SEARCHES.has(tool),
        preferredProvider: preferred,
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
