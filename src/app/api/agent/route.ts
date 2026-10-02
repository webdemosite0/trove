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
import { buildTroSystemPrompt, buildTeamSection } from "@/lib/tro-prompt";

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
  const connectorContext = await buildChatConnectorContext(lastUser, {
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

  const system = buildTroSystemPrompt({
    agent: { name: agent.name, role: agent.role, instructions: agent.instructions, tools },
    browserNote,
    connectedNote: connectorContext.connectedNote,
    liveContext: connectorContext.liveContext + connectorToolSection,
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
