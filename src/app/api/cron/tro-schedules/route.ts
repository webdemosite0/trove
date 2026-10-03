import { one, all, run, uid, str, num } from "@/lib/db";
import { generateText } from "@/lib/ai";
import { buildTroSystemPrompt } from "@/lib/tro-prompt";
import { buildChatConnectorContext } from "@/lib/chat-connectors";
import { buildTroConnectorToolSection, executeConnectorTool } from "@/lib/tro-connector-tools";
import { parseConnectorToolBlocks, stripConnectorToolBlocks } from "@/lib/tool-block";
import { nextCronRun } from "@/lib/schedule-block";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/tro-schedules — fires due Tro scheduled tasks.
 * Called by Vercel Cron every minute. Authenticates via CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    url.searchParams.get("secret")?.trim() ||
    "";
  // Vercel Cron can't send custom headers on Hobby; allow its user-agent as a fallback.
  const vercelCron = req.headers.get("user-agent")?.includes("vercel-cron") ?? false;
  if (secret && provided !== secret && !vercelCron) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!secret && process.env.VERCEL_ENV === "production" && !vercelCron) {
    return Response.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }

  const now = Date.now();
  const due = (await all(
    `SELECT * FROM tro_scheduled_tasks WHERE active = 1 AND next_run_at IS NOT NULL AND next_run_at <= ? ORDER BY next_run_at ASC LIMIT 20`,
    [now],
  )) as Record<string, unknown>[];

  const results: Array<{ id: string; ok: boolean; detail?: string }> = [];
  for (const row of due) {
    const id = str(row.id);
    try {
      // Claim first: advance the schedule BEFORE executing so a crash or
      // overlap can't double-fire the task.
      const cronExpr = row.cron_expr == null ? null : str(row.cron_expr);
      const timezone = str(row.timezone) || "UTC";
      let nextRun: number | null = null;
      let stillActive = true;
      if (cronExpr) {
        nextRun = nextCronRun(cronExpr, now, timezone);
        if (!nextRun) stillActive = false;
      } else {
        stillActive = false; // one-time task
      }
      await run(
        `UPDATE tro_scheduled_tasks SET last_run_at = ?, next_run_at = ?, active = ?, updated_at = ? WHERE id = ?`,
        [now, nextRun, stillActive ? 1 : 0, now, id],
      );
      await fireTask(row as Record<string, unknown>);
      results.push({ id, ok: true });
    } catch (e) {
      const detail = e instanceof Error ? e.message : "failed";
      console.error("tro-schedules: task failed", id, detail);
      results.push({ id, ok: false, detail });
    }
  }
  return Response.json({ ok: true, fired: results.length, results });
}

async function fireTask(row: Record<string, unknown>) {
  const userId = str(row.user_id);
  const agentId = str(row.agent_id);
  const title = str(row.title);
  const kind = str(row.kind) === "task" ? "task" : "reminder";
  const instruction = str(row.instruction);
  const now = Date.now();

  if (kind === "reminder") {
    await run(
      `INSERT INTO reminders (id, user_id, title, note, due_at, done, notified, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [uid("rem"), userId, title, instruction, now, now],
    );
    return;
  }

  // kind "task": run the Tro on the instruction, then notify with the outcome.
  const agent = await one(`SELECT * FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    userId,
  ]);
  if (!agent) throw new Error("Tro not found.");
  const agentRow = agent as Record<string, unknown>;

  let tools: string[] = [];
  try {
    tools = JSON.parse(str(agentRow.tools) || "[]");
  } catch {
    tools = [];
  }
  const timeZone = safeTimeZone(str(agentRow.timezone) || "UTC");
  const connectorContext = await buildChatConnectorContext(instruction, {
    connectorTools: true,
  }).catch(() => ({ requested: [] as string[], connectedNote: "", liveContext: "" }));
  let connectorToolSection = "";
  try {
    connectorToolSection = await buildTroConnectorToolSection(userId, connectorContext.requested);
  } catch {
    connectorToolSection = "";
  }

  const system = buildTroSystemPrompt({
    agent: {
      name: str(agentRow.name),
      role: str(agentRow.role),
      instructions: str(agentRow.instructions),
      tools,
    },
    browserNote: "",
    connectedNote: connectorContext.connectedNote,
    liveContext: connectorContext.liveContext + connectorToolSection,
    timeZone,
    obeyFormat: OBEY_FORMAT,
    situation: situation({ timeZone, canSearch: true }),
    teamSection: "",
  });

  const scheduledPreamble =
    `This is a SCHEDULED task firing ("${title}"). ` +
    `Do the work described below, then report the outcome concisely for a reminder notification. ` +
    `Use connector-tool blocks for any integration actions.\n\nTask: ${instruction}`;

  let full = "";
  try {
    full = await generateText({
      turns: [{ role: "user", text: scheduledPreamble }],
      system,
      temperature: 0.5,
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "agent run failed");
  }

  // Server-side connector-tool loop (max 2 rounds) so scheduled tasks can
  // take real actions (calendar events, emails, messages).
  for (let round = 0; round < 2; round++) {
    const parsed = parseConnectorToolBlocks(full);
    if (!parsed.calls.length) break;
    const outcomes: string[] = [];
    for (const call of parsed.calls.slice(0, 3)) {
      try {
        const outcome = await executeConnectorTool(userId, call.service, call.tool ?? call.action ?? "", call.args);
        outcomes.push(
          outcome.ok
            ? `**${call.service}** succeeded:\n${String(outcome.result ?? "").slice(0, 2000)}`
            : `**${call.service}** failed: ${outcome.error ?? "error"}`,
        );
      } catch (e) {
        outcomes.push(`**${call.service}** failed: ${e instanceof Error ? e.message : "error"}`);
      }
    }
    try {
      full = await generateText({
        turns: [
          { role: "user", text: scheduledPreamble },
          { role: "model", text: parsed.text },
          {
            role: "user",
            text: `Tool results:\n\n${outcomes.join("\n\n---\n\n")}\n\nReport the final outcome concisely for a reminder notification. Never mention tool blocks.`,
          },
        ],
        system,
        temperature: 0.5,
      });
    } catch {
      full = parsed.text;
      break;
    }
  }
  full = stripConnectorToolBlocks(full).trim() || "Done.";

  await run(
    `INSERT INTO reminders (id, user_id, title, note, due_at, done, notified, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
    [uid("rem"), userId, `⏰ ${title}`, full.slice(0, 2000), now, now],
  );
}
