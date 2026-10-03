import { currentUser } from "@/lib/auth";
import { one, run, str, num } from "@/lib/db";
import { nextCronRun } from "@/lib/schedule-block";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownTask(userId: string, id: string) {
  const row = await one(`SELECT * FROM tro_scheduled_tasks WHERE id = ? AND user_id = ?`, [
    id,
    userId,
  ]);
  return (row ?? null) as Record<string, unknown> | null;
}

/**
 * PATCH /api/tro/schedule/[id] { active?: boolean } — pause/resume.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const task = await ownTask(user.id, id);
  if (!task) return Response.json({ error: "Task not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const now = Date.now();
  if (typeof body?.active === "boolean") {
    const active = body.active ? 1 : 0;
    let nextRunAt = task.next_run_at == null ? null : num(task.next_run_at);
    // Recompute next run when resuming a recurring task whose slot passed.
    if (body.active && str(task.cron_expr) && (!nextRunAt || nextRunAt <= now)) {
      nextRunAt =
        nextCronRun(str(task.cron_expr), now, str(task.timezone) || "UTC") ?? nextRunAt;
    }
    await run(
      `UPDATE tro_scheduled_tasks SET active = ?, next_run_at = ?, updated_at = ? WHERE id = ?`,
      [active, nextRunAt, now, id],
    );
  }
  const row = await one(`SELECT * FROM tro_scheduled_tasks WHERE id = ?`, [id]);
  return Response.json({ ok: true, task: row });
}

/**
 * DELETE /api/tro/schedule/[id] — remove a scheduled task.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const task = await ownTask(user.id, id);
  if (!task) return Response.json({ error: "Task not found." }, { status: 404 });
  await run(`DELETE FROM tro_scheduled_tasks WHERE id = ?`, [id]);
  return Response.json({ ok: true });
}
