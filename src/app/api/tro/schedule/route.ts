import { currentUser } from "@/lib/auth";
import { one, all, run, uid, str, num } from "@/lib/db";
import { isValidCron, nextCronRun } from "@/lib/schedule-block";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ScheduledTask {
  id: string;
  agentId: string;
  title: string;
  kind: "reminder" | "task";
  instruction: string;
  runAt: number | null;
  cronExpr: string | null;
  timezone: string;
  active: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  createdAt: number;
  updatedAt: number;
}

function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id: str(row.id),
    agentId: str(row.agent_id),
    title: str(row.title),
    kind: str(row.kind) === "task" ? "task" : "reminder",
    instruction: str(row.instruction),
    runAt: row.run_at == null ? null : num(row.run_at),
    cronExpr: row.cron_expr == null ? null : str(row.cron_expr),
    timezone: str(row.timezone) || "UTC",
    active: num(row.active) === 1,
    lastRunAt: row.last_run_at == null ? null : num(row.last_run_at),
    nextRunAt: row.next_run_at == null ? null : num(row.next_run_at),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

async function ownAgent(userId: string, agentId: string): Promise<boolean> {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    userId,
  ]);
  return Boolean(row);
}

/**
 * GET /api/tro/schedule?agentId=... — list the Tro's scheduled tasks.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const agentId = new URL(req.url).searchParams.get("agentId") ?? "";
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const rows = await all(
    `SELECT * FROM tro_scheduled_tasks WHERE user_id = ? AND agent_id = ? ORDER BY next_run_at ASC NULLS LAST, created_at DESC LIMIT 100`,
    [user.id, agentId],
  );
  return Response.json({ tasks: rows.map((r) => rowToTask(r as Record<string, unknown>)) });
}

/**
 * POST /api/tro/schedule { agentId, title, kind, instruction, run_at?, cron?, timezone? }
 * Create a scheduled task. run_at is ISO 8601 (one-time); cron is 5-field (recurring).
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentId = String(body?.agentId ?? "");
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const instruction = String(body?.instruction ?? "").trim().slice(0, 2000);
  const kind = body?.kind === "task" ? "task" : "reminder";
  const timezone = String(body?.timezone ?? "UTC").trim().slice(0, 60) || "UTC";
  if (!title) return Response.json({ error: "Title required." }, { status: 400 });
  if (!instruction) return Response.json({ error: "Instruction required." }, { status: 400 });

  const now = Date.now();
  let runAt: number | null = null;
  let cronExpr: string | null = null;
  let nextRunAt: number | null = null;

  const rawRunAt = String(body?.run_at ?? "").trim();
  const rawCron = String(body?.cron ?? "").trim();
  if (rawCron) {
    if (!isValidCron(rawCron)) {
      return Response.json({ error: "Invalid schedule — use a 5-field cron like '0 9 * * 1-5'." }, { status: 400 });
    }
    cronExpr = rawCron;
    nextRunAt = nextCronRun(rawCron, now, timezone);
    if (!nextRunAt) {
      return Response.json({ error: "Could not compute the next run for that schedule." }, { status: 400 });
    }
  } else if (rawRunAt) {
    const t = Date.parse(rawRunAt);
    if (!Number.isFinite(t)) {
      return Response.json({ error: "Invalid date/time — use ISO 8601." }, { status: 400 });
    }
    if (t <= now) {
      return Response.json({ error: "That time is in the past." }, { status: 400 });
    }
    runAt = t;
    nextRunAt = t;
  } else {
    return Response.json({ error: "Provide run_at (one-time) or cron (recurring)." }, { status: 400 });
  }

  const id = uid("sched");
  await run(
    `INSERT INTO tro_scheduled_tasks (id, user_id, agent_id, title, kind, instruction, run_at, cron_expr, timezone, active, next_run_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [id, user.id, agentId, title, kind, instruction, runAt, cronExpr, timezone, nextRunAt, now, now],
  );
  const row = await one(`SELECT * FROM tro_scheduled_tasks WHERE id = ?`, [id]);
  return Response.json({ task: rowToTask((row ?? {}) as Record<string, unknown>) });
}
