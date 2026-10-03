"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Thinking } from "@/components/chat/thinking";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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

export type TaskStatus = "queued" | "working" | "waiting" | "done" | "failed" | "cancelled";

export interface FeedEvent {
  id: string;
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

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<TaskStatus, { label: string; dot: string; ring: string }> = {
  queued: { label: "Queued", dot: "bg-ink-4", ring: "ring-ink-4/30" },
  working: { label: "Working", dot: "bg-info", ring: "ring-info/30" },
  waiting: { label: "Waiting for you", dot: "bg-warn", ring: "ring-warn/30" },
  done: { label: "Done", dot: "bg-ok", ring: "ring-ok/30" },
  failed: { label: "Failed", dot: "bg-critical", ring: "ring-critical/30" },
  cancelled: { label: "Cancelled", dot: "bg-ink-3", ring: "ring-ink-3/30" },
};

const KIND_ICON: Partial<Record<TaskEventKind, string>> = {
  task_created: "◈",
  task_started: "▶",
  task_progress: "…",
  task_waiting: "⏸",
  task_done: "✓",
  task_failed: "✕",
  task_cancelled: "⊘",
  task_retried: "↻",
  delegated: "⇄",
  delegate_result: "⇐",
  artifact_saved: "▣",
  approval_requested: "!",
  approval_resolved: "✓",
  tool_used: "⚙",
  note: "•",
};

function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ------------------------------------------------------------------ */
/* TaskFeed                                                            */
/* ------------------------------------------------------------------ */

/**
 * Truthful task activity feed for Tros.
 * - `agentId` set: feed for one Tro. Omitted: aggregated feed across all Tros.
 * - Polls the API; shows status dots, delegation chains, and verified outputs.
 */
export function TaskFeed({
  agentId,
  limit = 50,
  pollMs = 8000,
  compact = false,
  className,
  onCancelTask,
  onRetryTask,
}: {
  agentId?: string;
  limit?: number;
  pollMs?: number;
  compact?: boolean;
  className?: string;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
}) {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (agentId) qs.set("agentId", agentId);
      const res = await fetch(`/api/tro/activity?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity.");
    }
  }, [agentId, limit]);

  useEffect(() => {
    void load();
    if (pollMs <= 0) return;
    const t = setInterval(() => void load(), pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  if (events === null) {
    return (
      <div className={cn("flex items-center gap-2 px-1 py-4 text-ink-3", className)}>
        <Thinking size={18} />
        <span className="text-[13px]">Loading activity…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("px-1 py-4 text-[13px] text-ink-3", className)}>
        Couldn&apos;t load activity ({error}).{" "}
        <button onClick={() => void load()} className="text-accent underline">
          Retry
        </button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className={cn("px-1 py-6 text-center", className)}>
        <p className="text-[13.5px] font-medium text-ink-2">No activity yet</p>
        <p className="mt-1 text-[12.5px] text-ink-4">
          Tasks, delegations, and tool runs will appear here with real evidence.
        </p>
      </div>
    );
  }

  return (
    <ol className={cn("relative space-y-1", className)}>
      {events.map((ev) => (
        <EventRow
          key={ev.id}
          ev={ev}
          compact={compact}
          showActor={!agentId}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
        />
      ))}
    </ol>
  );
}

function EventRow({
  ev,
  compact,
  showActor,
  onCancelTask,
  onRetryTask,
}: {
  ev: FeedEvent;
  compact: boolean;
  showActor: boolean;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
}) {
  const meta = STATUS_META[ev.status];
  const icon = KIND_ICON[ev.kind] ?? "•";
  const live = ev.status === "working" || ev.status === "queued" || ev.status === "waiting";

  return (
    <li
      className={cn(
        "group flex gap-3 rounded-xl px-2 transition hover:bg-hover/50",
        compact ? "py-1.5" : "py-2.5",
      )}
    >
      {/* status dot */}
      <span className="relative mt-1.5 flex shrink-0 flex-col items-center">
        <span className={cn("size-2.5 rounded-full ring-4", meta.dot, meta.ring)} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13.5px] font-medium leading-snug text-ink">
            <span className="mr-1.5 inline-block w-4 text-center text-[11px] text-ink-4">{icon}</span>
            {ev.title}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
              ev.status === "done" && "bg-ok/10 text-ok",
              ev.status === "working" && "bg-info/10 text-info",
              ev.status === "waiting" && "bg-warn/10 text-warn",
              ev.status === "failed" && "bg-critical/10 text-critical",
              ev.status === "queued" && "bg-sunk text-ink-3",
              ev.status === "cancelled" && "bg-sunk text-ink-4",
            )}
          >
            {meta.label}
          </span>
        </div>

        {ev.detail ? (
          <p className="mt-0.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-3">{ev.detail}</p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
          {showActor && ev.actor_name ? <span>{ev.actor_name}</span> : null}
          {ev.target_agent_name ? (
            <span>
              → <span className="font-medium text-ink-3">{ev.target_agent_name}</span>
            </span>
          ) : null}
          {ev.verified && ev.status === "done" ? (
            <span className="text-ok">✓ verified output</span>
          ) : null}
          <span title={new Date(ev.created_at).toLocaleString()}>{timeAgo(ev.created_at)}</span>
        </div>

        {/* actions for live tasks */}
        {live && ev.task_id ? (
          <div className="mt-1.5 flex gap-2 opacity-0 transition group-hover:opacity-100">
            {onCancelTask && (ev.status === "working" || ev.status === "queued") ? (
              <button
                onClick={() => onCancelTask(ev.task_id!)}
                className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-3 transition hover:border-critical/50 hover:text-critical"
              >
                Cancel
              </button>
            ) : null}
            {onRetryTask && ev.status === "waiting" ? (
              <button
                onClick={() => onRetryTask(ev.task_id!)}
                className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-3 transition hover:border-accent/50 hover:text-accent"
              >
                Resume
              </button>
            ) : null}
          </div>
        ) : null}
        {!live && ev.status === "failed" && ev.task_id && onRetryTask ? (
          <div className="mt-1.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => onRetryTask(ev.task_id!)}
              className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-3 transition hover:border-accent/50 hover:text-accent"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
