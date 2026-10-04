"use client";

import { useCallback, useEffect, useState } from "react";
import { FiBell, FiClock, FiPlus, FiRepeat, FiTrash2, FiX, FiZap } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { TroPngIcon } from "@/components/tro/tro-png-icons";

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
}

function formatNext(t: ScheduledTask): string {
  if (!t.active) return "Paused";
  if (!t.nextRunAt) return "—";
  const d = new Date(t.nextRunAt);
  const now = Date.now();
  const diff = t.nextRunAt - now;
  if (diff < 0) return "Due";
  if (diff < 60_000) return "In a moment";
  if (diff < 3_600_000) return `In ${Math.round(diff / 60_000)}m`;
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TroTasksPanel({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [tasks, setTasks] = useState<ScheduledTask[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/tro/schedule?agentId=${encodeURIComponent(agentId)}`);
      const d = await r.json().catch(() => null);
      if (r.ok && d?.tasks) setTasks(d.tasks);
    } catch {
      /* keep old list */
    }
  }, [agentId]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("tro-schedules-changed", onChange);
    return () => window.removeEventListener("tro-schedules-changed", onChange);
  }, [load]);

  const toggle = useCallback(
    async (task: ScheduledTask) => {
      setTasks((t) => t?.map((x) => (x.id === task.id ? { ...x, active: !x.active } : x)) ?? t);
      try {
        await fetch(`/api/tro/schedule/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !task.active }),
        });
      } finally {
        load();
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      setTasks((t) => t?.filter((x) => x.id !== id) ?? t);
      try {
        await fetch(`/api/tro/schedule/${id}`, { method: "DELETE" });
      } finally {
        load();
      }
    },
    [load],
  );

  return (
    <section className="app-block-in border-t border-line px-4 py-3" style={{ ["--app-delay" as string]: "240ms" }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
          <TroPngIcon name="schedule" size={11} className="dark:brightness-0 dark:invert" /> Scheduled tasks
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setShowForm((s) => !s);
          }}
          className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold text-ink-2 transition hover:bg-hover hover:text-ink"
        >
          {showForm ? <FiX size={11} /> : <FiPlus size={11} />}
          {showForm ? "Close" : "New"}
        </button>
      </div>

      {showForm ? (
        <TaskForm
          agentId={agentId}
          saving={saving}
          setSaving={setSaving}
          error={formError}
          setError={setFormError}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      ) : null}

      {tasks === null ? (
        <p className="text-[12px] text-ink-4">Loading schedules…</p>
      ) : tasks.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-ink-4">
          Nothing scheduled yet. Tell {agentName.split(" ")[0]} something like{" "}
          <span className="text-ink-3">“remind me at 5pm”</span> or{" "}
          <span className="text-ink-3">“every weekday at 9am, brief me”</span> — or add one below.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={cn(
                "rounded-xl border border-line bg-canvas p-2.5 transition",
                !t.active && "opacity-55",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                    t.kind === "task" ? "bg-accent/15 text-accent" : "bg-amber-500/15 text-amber-500",
                  )}
                >
                  {t.kind === "task" ? <TroPngIcon name="tasks" size={13} className="dark:brightness-0 dark:invert" /> : <TroPngIcon name="notifications" size={13} className="dark:brightness-0 dark:invert" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">{t.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                    <span className="font-medium text-ink-2">{formatNext(t)}</span>
                    {t.cronExpr ? (
                      <span className="inline-flex items-center gap-0.5">
                        <TroPngIcon name="retry" size={10} className="dark:brightness-0 dark:invert" /> {t.cronExpr}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-4">
                    {t.instruction}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    title={t.active ? "Pause" : "Resume"}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition",
                      t.active ? "bg-positive" : "bg-line",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                        t.active ? "left-[18px]" : "left-0.5",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    title="Delete"
                    className="grid size-6 place-items-center rounded-lg text-ink-4 transition hover:bg-critical/10 hover:text-critical"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-4">
        Reminders land in <span className="font-semibold text-ink-3">/reminders</span>; tasks wake{" "}
        {agentName.split(" ")[0]} up to do the work and report back.
      </p>
    </section>
  );
}

function TaskForm({
  agentId,
  saving,
  setSaving,
  error,
  setError,
  onDone,
}: {
  agentId: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"reminder" | "task">("reminder");
  const [mode, setMode] = useState<"once" | "repeat">("once");
  const [when, setWhen] = useState("");
  const [cron, setCron] = useState("");
  const [instruction, setInstruction] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give it a title.");
    if (!instruction.trim()) return setError("Say what should happen.");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        agentId,
        title: title.trim(),
        kind,
        instruction: instruction.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      if (mode === "once") {
        if (!when) {
          setError("Pick a date and time.");
          setSaving(false);
          return;
        }
        body.run_at = new Date(when).toISOString();
      } else {
        if (!cron.trim()) {
          setError("Enter a cron schedule, e.g. 0 9 * * 1-5.");
          setSaving(false);
          return;
        }
        body.cron = cron.trim();
      }
      const r = await fetch("/api/tro/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.task) {
        setError(d?.error ?? "Couldn't save the task.");
        setSaving(false);
        return;
      }
      onDone();
    } catch {
      setError("Network error — try again.");
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-line bg-raised px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-5 outline-none focus:border-accent/60";

  return (
    <form onSubmit={submit} className="mb-3 space-y-2 rounded-xl border border-line bg-canvas p-3">
      <input
        className={inputCls}
        placeholder="Title — e.g. Call mom"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <div className="flex gap-1.5">
        {(["reminder", "task"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition",
              kind === k
                ? "border-accent/50 bg-accent/10 text-ink"
                : "border-line text-ink-3 hover:text-ink-2",
            )}
          >
            {k === "reminder" ? "🔔 Reminder" : "⚡ Task (Tro does it)"}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {(["once", "repeat"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition",
              mode === m
                ? "border-accent/50 bg-accent/10 text-ink"
                : "border-line text-ink-3 hover:text-ink-2",
            )}
          >
            {m === "once" ? "One time" : "Repeating"}
          </button>
        ))}
      </div>
      {mode === "once" ? (
        <input
          type="datetime-local"
          className={inputCls}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      ) : (
        <input
          className={inputCls}
          placeholder="Cron — e.g. 0 9 * * 1-5 (weekdays 9am)"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
        />
      )}
      <textarea
        className={cn(inputCls, "min-h-[52px] resize-y")}
        placeholder={
          kind === "reminder"
            ? "Reminder message…"
            : "What should the Tro do when this fires? (can use your connected apps)"
        }
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        maxLength={2000}
      />
      {error ? <p className="text-[11.5px] text-critical">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Schedule it"}
      </button>
    </form>
  );
}
