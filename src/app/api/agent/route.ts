import type { NextRequest } from "next/server";
import { streamText, type Turn } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { all, one, str } from "@/lib/db";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { buildChatConnectorContext } from "@/lib/chat-connectors";
import { buildTroConnectorToolSection } from "@/lib/tro-connector-tools";
import { buildTroBrowserToolSection } from "@/lib/browser-tool-block";
import { buildTroScheduleSection } from "@/lib/schedule-block";
import { buildTroSystemPrompt, buildTeamSection } from "@/lib/tro-prompt";
import { temperatureFor, hintFor } from "@/lib/modes";
import { TRUNCATION_MARKER, isIncompleteFinish } from "@/lib/truncation";

export const runtime = "nodejs";

/**
 * PLAN MODE hint: the user asked the Tro to plan, not execute. No tool
 * blocks, no side effects — write the plan, then ask for approval.
 */
const PLAN_MODE_HINT =
  "PLAN MODE is on: do not take any actions this turn. Do NOT emit " +
  "connector-tool, browser-tool, local-browser, schedule-task, team-hire, " +
  "or team-delegate blocks, and do NOT save artifacts. Write a clear " +
  "step-by-step plan for what you would do, then use an ask-block to get " +
  "the user's approval before acting.";

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
  // Optional response mode (fast | balanced | deep | creative) and plan mode.
  // Absent → the long-standing defaults are preserved.
  let mode: string | undefined;
  let planMode = false;
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    timeZone = safeTimeZone(body?.timeZone);
    browser = body?.browser && typeof body.browser === "object" ? body.browser : null;
    if (typeof body?.mode === "string") mode = body.mode;
    planMode = body?.plan === true;
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
        mode: row.mode == null ? null : str(row.mode),
      }
    : undefined;

  if (!agent) {
    return Response.json({ error: "Agent not found." }, { status: 404 });
  }
  // The Tro's stored response mode is the default; a per-request mode overrides it.
  if (!mode) mode = agent.mode ?? undefined;
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
  // Scan recent history for @mentions so follow-up messages ("again send",
  // "no one") keep the integration tools from earlier in the conversation.
  const mentionScope = turns
    .slice(-6)
    .map((t) => (typeof t.text === "string" ? t.text : ""))
    .join("\n");
  const connectorContext = await buildChatConnectorContext(mentionScope, {
    connectorTools: true,
  });
  // @mentioned, connected integrations become callable tools for this turn.
  let connectorToolSection = "";
  try {
    connectorToolSection = await buildTroConnectorToolSection(
      user.id,
      connectorContext.requested,
    );
  } catch {
    connectorToolSection = "";
  }

  // @mentioned skills: the Tro adopts the skill's behavior for this turn.
  let troSkillSection = "";
  try {
    const { parseSkillMentions, resolveMentionedSkills, buildTroSkillSection } =
      await import("@/lib/tro-skills");
    const mentioned = parseSkillMentions(mentionScope);
    if (mentioned.length) {
      const skills = await resolveMentionedSkills(user.id, mentioned);
      troSkillSection = buildTroSkillSection(skills);
    }
  } catch {
    troSkillSection = "";
  }

  // Team roster so this Tro can delegate/hire teammates.
  let teamSection = "";
  try {
    const rosterRows = (await all(
      `SELECT id, name, role, parent_id FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id],
    )) as { id: unknown; name: unknown; role: unknown; parent_id: unknown }[];
    teamSection = buildTeamSection(
      agentId,
      rosterRows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        role: String(r.role),
        parent_id: r.parent_id == null ? null : String(r.parent_id),
      })),
    );
  } catch {
    teamSection = "";
  }

  const browserNote = browser?.sessionId
    ? `CLOUD COMPUTER is connected.\nCurrent page: ${browser.pageUrl || "about:blank"}${browser.title ? ` (“${browser.title}”)` : ""}.\nWhen the user asks you to browse, research, or open a site, assume the computer can navigate. Reference what is on screen when useful.`
    : `CLOUD COMPUTER starts automatically in this workspace. When the user shares a URL or asks to research the web, treat browsing as available.`;

  // Fetch knowledge base and enabled memories for this Tro.
  let knowledge: { title: string; content: string }[] = [];
  let memories: { kind: "preference" | "task"; content: string }[] = [];
  try {
    const kRows = (await all(
      `SELECT title, content FROM tro_knowledge WHERE user_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 10`,
      [user.id, agentId],
    )) as { title: unknown; content: unknown }[];
    knowledge = kRows.map((r) => ({ title: String(r.title), content: String(r.content) }));
  } catch { /* table may not exist yet */ }
  try {
    const mRows = (await all(
      `SELECT kind, content FROM tro_memories WHERE user_id = ? AND agent_id = ? AND enabled = 1 ORDER BY updated_at DESC LIMIT 20`,
      [user.id, agentId],
    )) as { kind: unknown; content: unknown }[];
    memories = mRows
      .filter((r) => r.kind === "preference" || r.kind === "task")
      .map((r) => ({ kind: r.kind as "preference" | "task", content: String(r.content) }));
  } catch { /* table may not exist yet */ }

  const system = buildTroSystemPrompt({
    agent: { name: agent.name, role: agent.role, instructions: agent.instructions, tools },
    knowledge,
    memories,
    browserNote,
    connectedNote: connectorContext.connectedNote,
    liveContext:
      connectorContext.liveContext +
      connectorToolSection +
      troSkillSection +
      buildTroBrowserToolSection() +
      buildTroScheduleSection(timeZone),
    timeZone,
    obeyFormat: OBEY_FORMAT,
    situation: situation({ timeZone, canSearch: true }),
    teamSection,
  });

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
    // The provider's finish reason tells us the reply was cut off — by the
    // token limit ("length"/"MAX_TOKENS") or by a mid-stream failure after
    // text was already emitted ("stream_error"). The stream is plain text
    // with no metadata channel, so an incomplete reply is signalled with a
    // trailer the client strips before showing or saving it. A truncated
    // reply must never be presented as a clean completion.
    let finishReason: string | null = null;
    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, "agent", u.totalTokens),
      onFinishReason: (reason) => {
        finishReason = reason;
      },
      turns,
      system: [system, mode ? hintFor(mode) : "", planMode ? PLAN_MODE_HINT : ""]
        .filter(Boolean)
        .join("\n\n"),
      temperature: mode ? temperatureFor(mode) : 0.75,
      extraParts: attachments.length ? toParts(attachments) : undefined,
    });
    const withTrailer = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush(controller) {
          if (isIncompleteFinish(finishReason)) {
            controller.enqueue(
              new TextEncoder().encode(`\n\n${TRUNCATION_MARKER}\n`),
            );
          }
        },
      }),
    );
    return new Response(withTrailer, {
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
