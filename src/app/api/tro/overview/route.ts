// GET /api/tro/overview — aggregated home-page data for the Tros view.
// Returns active tasks, pending approvals, attention items, recent artifacts,
// and per-agent activity in one call. All independent queries run in parallel.
import { currentUser } from "@/lib/auth";
import { all, str, num } from "@/lib/db";
import { listActiveTasks, type TaskEvent } from "@/lib/tro-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ApprovalItem {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  detail: string;
  createdAt: number;
}

interface AttentionTask {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  kind: "failed" | "paused" | "overdue";
  detail: string;
  createdAt: number;
}

interface ArtifactItem {
  id: string;
  agentId: string;
  agentName: string;
  kind: string;
  title: string;
  updatedAt: number;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });

  const now = Date.now();

  // All six queries are independent — run them concurrently.
  const [
    agentRows,
    activeRaw,
    approvalRows,
    failedRows,
    schedRows,
    artRows,
    actRows,
  ] = await Promise.all([
    all(`SELECT id, name FROM agents WHERE user_id = ?`, [user.id]),
    listActiveTasks(user.id),
    all(
      `SELECT e.* FROM tro_task_events e
       WHERE e.user_id = ? AND e.kind = 'approval_requested'
         AND NOT EXISTS (
           SELECT 1 FROM tro_task_events r
           WHERE r.user_id = e.user_id
             AND r.kind = 'approval_resolved'
             AND COALESCE(r.task_id, '') = COALESCE(e.task_id, '')
             AND r.created_at > e.created_at
         )
       ORDER BY e.created_at DESC
       LIMIT 20`,
      [user.id],
    ),
    all(
      `SELECT e.* FROM tro_task_events e
       INNER JOIN (
         SELECT task_id, MAX(created_at) AS mc FROM tro_task_events
         WHERE user_id = ? AND task_id IS NOT NULL
         GROUP BY task_id
       ) latest ON latest.task_id = e.task_id AND latest.mc = e.created_at
       WHERE e.user_id = ? AND e.status = 'failed'
       ORDER BY e.created_at DESC
       LIMIT 10`,
      [user.id, user.id],
    ),
    all(
      `SELECT s.*, a.name AS agent_name FROM tro_scheduled_tasks s
       LEFT JOIN agents a ON a.id = s.agent_id
       WHERE s.user_id = ?
         AND (s.active = 0 OR (s.active = 1 AND s.next_run_at IS NOT NULL AND s.next_run_at < ?))
       ORDER BY s.updated_at DESC
       LIMIT 10`,
      [user.id, now],
    ),
    all(
      `SELECT a.id, a.agent_id, a.kind, a.title, a.updated_at, g.name AS agent_name
       FROM tro_artifacts a
       LEFT JOIN agents g ON g.id = a.agent_id
       WHERE a.user_id = ?
       ORDER BY a.updated_at DESC
       LIMIT 8`,
      [user.id],
    ),
    all(
      `SELECT agent_id, MAX(created_at) AS last_at
       FROM tro_task_events WHERE user_id = ?
       GROUP BY agent_id`,
      [user.id],
    ),
  ]) as [
    Record<string, unknown>[],
    TaskEvent[],
    Record<string, unknown>[],
    Record<string, unknown>[],
    Record<string, unknown>[],
    Record<string, unknown>[],
    Record<string, unknown>[],
  ];

  const agentName = new Map<string, string>();
  for (const r of agentRows) agentName.set(str(r.id), str(r.name));

  // 1. Active tasks (queued/working/waiting) with agent names.
  const activeTasks = activeRaw.map((t: TaskEvent) => ({
    id: t.id,
    taskId: t.task_id,
    agentId: t.agent_id,
    agentName: agentName.get(t.agent_id) ?? t.actor_name ?? "Tro",
    kind: t.kind,
    status: t.status,
    title: t.title,
    detail: t.detail,
    targetAgentName: t.target_agent_name,
    createdAt: t.created_at,
  }));

  // 2. Pending approvals.
  const pendingApprovals: ApprovalItem[] = approvalRows.map((r) => ({
    id: str(r.id),
    agentId: str(r.agent_id),
    agentName: agentName.get(str(r.agent_id)) ?? str(r.actor_name) ?? "Tro",
    title: str(r.title) || "Approval needed",
    detail: str(r.detail),
    createdAt: num(r.created_at),
  }));

  // 3a. Failed tasks (latest event per task is failed).
  const attention: AttentionTask[] = failedRows.map((r) => ({
    id: str(r.id),
    agentId: str(r.agent_id),
    agentName: agentName.get(str(r.agent_id)) ?? "Tro",
    title: str(r.title) || "Task failed",
    kind: "failed" as const,
    detail: str(r.detail),
    createdAt: num(r.created_at),
  }));

  // 3b. Paused + overdue scheduled tasks.
  for (const r of schedRows) {
    const active = num(r.active) === 1;
    attention.push({
      id: str(r.id),
      agentId: str(r.agent_id),
      agentName: str(r.agent_name) || agentName.get(str(r.agent_id)) || "Tro",
      title: str(r.title),
      kind: active ? ("overdue" as const) : ("paused" as const),
      detail: active ? "Scheduled run missed" : "Schedule paused",
      createdAt: num(r.updated_at),
    });
  }

  // 4. Recent artifacts across all agents.
  const recentArtifacts: ArtifactItem[] = artRows.map((r) => ({
    id: str(r.id),
    agentId: str(r.agent_id),
    agentName: str(r.agent_name) || "Tro",
    kind: str(r.kind),
    title: str(r.title) || "Untitled",
    updatedAt: num(r.updated_at),
  }));

  // 5. Per-agent last activity (latest task event).
  const agentActivity: Record<string, number> = {};
  for (const r of actRows) agentActivity[str(r.agent_id)] = num(r.last_at);

  return Response.json({
    activeTasks,
    pendingApprovals,
    attention,
    recentArtifacts,
    agentActivity,
  });
}
