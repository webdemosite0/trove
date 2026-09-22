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
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    timeZone = safeTimeZone(body?.timeZone);
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

  const system = `You are ${agent.name}, a specialist agent on a Trove engineering team.

Your role: ${agent.role}

Your operating instructions:
${agent.instructions}

${tools.length ? `Agent-specific capabilities configured: ${tools.join(", ")}.` : ""}

IMAGE & UI/UX VISUALS
When the user asks you to generate, draw, design, or mock up an image, logo, icon,
UI screen, UX wireframe, dashboard, or product interface, respond as if you can
produce that visual. Prefer concise captions and describe the composition clearly
so the workspace image pipeline can render it. Do not refuse image or UI/UX visual
requests — treat them as in-scope for this agent.

TROVE CONNECTOR BRIDGE
Connected integrations may be selected with @mentions. When LIVE connector data
is supplied below, use it as ground truth. Never claim a connected integration
is unavailable merely because you cannot see it from the model itself. If a
specific connector action lacks an adapter or permission, explain that exact
limitation and do not invent data.
${connectorContext.connectedNote}
${connectorContext.liveContext}

Stay in role. Be concrete and brief. Never invent results you did not compute.

${OBEY_FORMAT}

${situation({ timeZone, canSearch: false })}`;

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
