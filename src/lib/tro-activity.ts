// Tro task activity feed — persistent, truthful event log (server-only).
// Events are only marked "done" when output is verified (artifact exists,
// delegation returned a result, tool confirmed success).

import "server-only";

import { all, one, run, uid, num, str } from "@/lib/db";

export type TaskEventKind =
  | "task_created"
  | "task_started"
  | "task_progress"
  | "task_waiting"
  | "task_done"
  | "task_failed"
  | "task_cancelled"
  | "task_retried"
  | "delegated"
  | "delegate_result"
  | "artifact_saved"
  | "approval_requested"
  | "approval_resolved"
  | "tool_used"
  | "note";

export type TaskStatus =
  | "queued"
  | "working"
  | "waiting"
  | "done"
  | "failed"
  | "cancelled";

export interface TaskEvent {
  id: string;
  user_id: string;
  agent_id: string;
  task_id: string | null;
  kind: TaskEventKind;
  status: TaskStatus;
  title: string;
  detail: string;
  actor_name: string;
  target_agent_id: string | null;
  target_agent_name: string | null;
  artifact_id: string | null;
  verified: boolean;
  created_at: number;
}

export interface LogEventInput {
  userId: string;
  agentId: string;
  kind: TaskEventKind;
  title: string;
  detail?: string;
  actorName?: string;
  taskId?: string | null;
  status?: TaskStatus;
  targetAgentId?: string | null;
  targetAgentName?: string | null;
  artifactId?: string | null;
  /** Only set true when output was actually verified (artifact saved, tool confirmed). */
  verified?: boolean;
}

const KIND_DEFAULT_STATUS: Record<TaskEventKind, TaskStatus> = {
  task_created: "queued",
  task_started: "working",
  task_progress: "working",
  task_waiting: "waiting",
  task_done: "done",
  task_failed: "failed",
  task_cancelled: "cancelled",
  task_retried: "working",
  delegated: "working",
  delegate_result: "done",
  artifact_saved: "done",
  approval_requested: "waiting",
  approval_resolved: "working",
  tool_used: "working",
  note: "working",
};

/** Persist one activity event. Never throws — logging must not break execution. */
export async function logTaskEvent(input: LogEventInput): Promise<string | null> {
  try {
    const id = uid("tev");
    const status = input.status ?? KIND_DEFAULT_STATUS[input.kind];
    // Truthfulness guard: "done" requires verified output.
    const verified = input.verified ?? false;
    const safeStatus: TaskStatus =
      status === "done" && !verified && input.kind !== "delegate_result"
        ? "working"
        : status;
    await run(
      `INSERT INTO tro_task_events
        (id, user_id, agent_id, task_id, kind, status, title, detail, actor_name,
         target_agent_id, target_agent_name, artifact_id, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.agentId,
        input.taskId ?? null,
        input.kind,
        safeStatus,
        input.title.slice(0, 300),
        (input.detail ?? "").slice(0, 2000),
        (input.actorName ?? "").slice(0, 120),
        input.targetAgentId ?? null,
        input.targetAgentName ?? null,
        input.artifactId ?? null,
        verified ? 1 : 0,
        Date.now(),
      ],
    );
    return id;
  } catch {
    return null;
  }
}

/** Recent events for one agent (newest first). */
export async function listAgentEvents(
  userId: string,
  agentId: string,
  limit = 50,
): Promise<TaskEvent[]> {
  const rows = (await all(
    `SELECT * FROM tro_task_events
     WHERE user_id = ? AND agent_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [userId, agentId, limit],
  )) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

/** Recent events across all of the user's Tros (for the Tros home feed). */
export async function listUserEvents(
  userId: string,
  limit = 50,
): Promise<TaskEvent[]> {
  const rows = (await all(
    `SELECT e.*, a.name AS _agent_name
     FROM tro_task_events e
     LEFT JOIN agents a ON a.id = e.agent_id
     WHERE e.user_id = ?
     ORDER BY e.created_at DESC LIMIT ?`,
    [userId, limit],
  )) as Record<string, unknown>[];
  return rows.map((r) => {
    const ev = rowToEvent(r);
    if (!ev.actor_name && r._agent_name) ev.actor_name = str(r._agent_name);
    return ev;
  });
}

/** Events for one task (oldest first — a timeline). */
export async function listTaskEvents(
  userId: string,
  taskId: string,
): Promise<TaskEvent[]> {
  const rows = (await all(
    `SELECT * FROM tro_task_events
     WHERE user_id = ? AND task_id = ?
     ORDER BY created_at ASC`,
    [userId, taskId],
  )) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

/** Live task states: latest event per task_id for an agent. */
export async function listActiveTasks(
  userId: string,
  agentId?: string,
): Promise<TaskEvent[]> {
  const rows = (await all(
    `SELECT e.* FROM tro_task_events e
     INNER JOIN (
       SELECT task_id, MAX(created_at) AS mc FROM tro_task_events
       WHERE user_id = ? ${agentId ? "AND agent_id = ?" : ""}
         AND task_id IS NOT NULL
       GROUP BY task_id
     ) latest ON latest.task_id = e.task_id AND latest.mc = e.created_at
     WHERE e.user_id = ? AND e.status IN ('queued','working','waiting')
     ORDER BY e.created_at DESC`,
    agentId ? [userId, agentId, userId] : [userId, userId],
  )) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

function rowToEvent(r: Record<string, unknown>): TaskEvent {
  return {
    id: str(r.id),
    user_id: str(r.user_id),
    agent_id: str(r.agent_id),
    task_id: r.task_id == null ? null : str(r.task_id),
    kind: str(r.kind) as TaskEventKind,
    status: str(r.status) as TaskStatus,
    title: str(r.title),
    detail: str(r.detail),
    actor_name: str(r.actor_name),
    target_agent_id: r.target_agent_id == null ? null : str(r.target_agent_id),
    target_agent_name: r.target_agent_name == null ? null : str(r.target_agent_name),
    artifact_id: r.artifact_id == null ? null : str(r.artifact_id),
    verified: num(r.verified) === 1,
    created_at: num(r.created_at),
  };
}

/** Convenience: verify an artifact exists before marking done. */
export async function artifactExists(
  userId: string,
  agentId: string,
  artifactId: string,
): Promise<boolean> {
  const row = await one(
    `SELECT id FROM tro_artifacts WHERE id = ? AND user_id = ? AND agent_id = ?`,
    [artifactId, userId, agentId],
  );
  return !!row;
}
