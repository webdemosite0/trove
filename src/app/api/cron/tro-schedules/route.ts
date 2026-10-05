import { one, all, run, uid, str, num } from "@/lib/db";
import { generateText } from "@/lib/ai";
import { buildTroSystemPrompt } from "@/lib/tro-prompt";
import { buildChatConnectorContext } from "@/lib/chat-connectors";
import { buildTroConnectorToolSection, executeConnectorTool } from "@/lib/tro-connector-tools";
import { parseConnectorToolBlocks, stripConnectorToolBlocks } from "@/lib/tool-block";
import { nextCronRun } from "@/lib/schedule-block";
import { temperatureFor } from "@/lib/modes";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/tro-schedules — fires due Tro scheduled tasks.
 * Runs every minute (Vercel Cron on Pro; cron-job.org ping on Hobby — see
 * vercel.json). Authenticates via CRON_SECRET (?secret= or Bearer), with the
 * Vercel Cron user-agent as a fallback when no secret is configured.
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

  // Heartbeat: even a run with zero due tasks proves the scheduler is alive.
  // The Tro Tasks tab reads this to show whether scheduling is actually live.
  await run(
    `INSERT INTO scheduler_health (id, last_run_at, last_fired, updated_at)
     VALUES ('tro-schedules', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_run_at = excluded.last_run_at,
       last_fired = excluded.last_fired, updated_at = excluded.updated_at`,
    [now, results.length, Date.now()],
  ).catch((e) => console.error("tro-schedules: health write failed", e));

  return Response.json({ ok: true, fired: results.length, results });
}

/**
 * Scheduled tasks are usually written without @mentions ("send an email at
 * 5pm to Sara"), but connector tools only load for mentioned services. Map
 * the obvious keywords to service mentions so a scheduled task can really
 * act — harmless when the service isn't connected (buildTroConnectorToolSection
 * drops unconnected services).
 */
function expandConnectorScope(instruction: string): string {
  const mentions: string[] = [];
  if (/\b(e-?mails?|gmail)\b/i.test(instruction)) mentions.push("@gmail");
  if (/\bcalendar\b/i.test(instruction)) mentions.push("@google-calendar");
  if (/\bdrive\b/i.test(instruction)) mentions.push("@google-drive");
  return mentions.length ? `${instruction}\n${mentions.join(" ")}` : instruction;
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
  // No session exists in the cron context, so the user id is passed
  // explicitly — otherwise listConnections() sees no user and the scheduled
  // run would think nothing is connected.
  const connectorContext = await buildChatConnectorContext(expandConnectorScope(instruction), {
    connectorTools: true,
    userId,
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
      mode: agentRow.mode == null ? null : str(agentRow.mode),
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
      temperature: agentRow.mode ? temperatureFor(String(agentRow.mode)) : 0.5,
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
  const outcome = full.slice(0, 2000);

  await run(
    `INSERT INTO reminders (id, user_id, title, note, due_at, done, notified, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
    [uid("rem"), userId, `⏰ ${title}`, outcome, now, now],
  );

  // Proactive delivery: post the Tro's reply as a REAL message in its chat
  // thread, so when the user opens the Tro it has already "answered" —
  // no message from the user required. The thread is a normal agent
  // conversation, so it shows up in the Tro's thread list via recents.
  const agentName = str(agentRow.name) || "Tro";
  const convoId = uid("conv");
  const threadTitle = `${agentName}: ⏰ ${title}`.slice(0, 90);
  const href = `/tros/${agentId}?c=${encodeURIComponent(convoId)}`;
  await run(
    `INSERT INTO conversations (id, user_id, kind, title, workspace_id, created_at, updated_at)
     VALUES (?, ?, 'agent', ?, NULL, ?, ?)`,
    [convoId, userId, threadTitle, now, now],
  );
  await run(
    `INSERT INTO messages (id, conversation_id, role, text, seq, created_at)
     VALUES (?, ?, 'model', ?, 0, ?)`,
    [uid("msg"), convoId, `⏰ ${title}\n\n${outcome}`, now],
  );
  await run(
    `INSERT INTO recents (id, user_id, kind, title, href, workspace_id, created_at)
     VALUES (?, ?, 'agent', ?, ?, NULL, ?)`,
    [uid("rec"), userId, threadTitle, href, now],
  );
}
