import type { NextRequest } from "next/server";
import { streamText, type Turn } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { buildChatConnectorContext } from "@/lib/chat-connectors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Log in to talk to your agents." }, { status: 401 });
  }

  let agentId = "";
  let turns: Turn[] = [];
  let attachments: Attachment[] = [];
  let timeZone = "UTC";
  let browser: { sessionId?: string; pageUrl?: string | null; title?: string | null } | null = null;
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    timeZone = safeTimeZone(body?.timeZone);
    browser = body?.browser && typeof body.browser === "object" ? body.browser : null;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const row = await one(`SELECT * FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    user.id,
  ]);
  const agent = row
    ? {
        name: str(row.name),
        role: str(row.role),
        instructions: str(row.instructions),
        tools: str(row.tools),
      }
    : undefined;

  if (!agent) {
    return Response.json({ error: "Agent not found." }, { status: 404 });
  }
  if (turns.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  let tools: string[] = [];
  try {
    tools = JSON.parse(agent.tools);
  } catch {
    tools = [];
  }

  const lastUser = [...turns].reverse().find((turn) => turn.role === "user")?.text ?? "";
  const connectorContext = await buildChatConnectorContext(lastUser);

  const browserNote = browser?.sessionId
    ? `CLOUD COMPUTER is connected.\nCurrent page: ${browser.pageUrl || "about:blank"}${browser.title ? ` (“${browser.title}”)` : ""}.\nWhen the user asks you to browse, research, or open a site, assume the computer can navigate. Reference what is on screen when useful.`
    : `CLOUD COMPUTER starts automatically in this workspace. When the user shares a URL or asks to research the web, treat browsing as available.`;

  const system = `You are ${agent.name}, a Tro specialist on Trove — a premium AI workspace.

Your role: ${agent.role}

Your operating instructions:
${agent.instructions}

${tools.length ? `Configured tools: ${tools.join(", ")}.` : ""}

CAPABILITIES (always in scope for a Tro)
1. Documents — draft full docs, memos, briefs, and reports in clean Markdown with headings, lists, and tables. Suggest saving to Trove Docs when done.
2. Spreadsheets — produce structured tables (CSV-ready or Markdown tables) for budgets, trackers, and analysis. Suggest Trove Sheets when useful.
3. Slides / decks — outline slide decks with title + bullets per slide; describe layouts for Design/Decks.
4. Web research — search and reason about public knowledge; when a URL is present, use the cloud computer context.
5. Cloud computer — browse pages, read what’s on screen, and guide next actions.
6. Images & UI — when asked for visuals, describe composition clearly for the image pipeline.

${browserNote}

TROVE CONNECTOR BRIDGE
Connected integrations may be selected with @mentions. When LIVE connector data
is supplied below, use it as ground truth. Never claim a connected integration
is unavailable merely because you cannot see it from the model itself.
${connectorContext.connectedNote}
${connectorContext.liveContext}

ASKING THE USER QUESTIONS
When a decision, a choice, or a missing detail genuinely blocks you, ask with a
structured card instead of plain prose. End your reply with exactly one fenced
block, and nothing after it:

\`\`\`ask
{"title": "Short context", "questions": [{"q": "Which option should I take?", "type": "radio", "options": ["Option A", "Option B"]}, {"q": "Anything else to include?", "type": "check", "options": ["X", "Y"]}]}
\`\`\`

Rules: at most 4 questions, at most 6 options each, short wording. "radio" means
pick one, "check" means pick any that apply. Only ask when you cannot proceed
without the answer — otherwise make the call yourself and keep working. After
the user answers, continue the task without re-asking.

Stay in role. Be concrete and brief. Never invent results you did not compute.
Prefer polished, structured output suitable for a product team.

${OBEY_FORMAT}

${situation({ timeZone, canSearch: true })}`;

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
    console.error("agent: credit check failed —", why);
    return Response.json(
      { error: `Could not reach the database to check your credits: ${why}` },
      { status: 503 },
    );
  }

  if (account) {
    const limited = await expensiveRequestLimit({
      userId: account.userId,
      scope: "agent",
      limit: 50,
    });
    if (limited) return limited;
  }

  try {
    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, "agent", u.totalTokens),
      turns,
      system,
      temperature: 0.75,
      extraParts: attachments.length ? toParts(attachments) : undefined,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("agent route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
