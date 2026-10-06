"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import {
  FiBell,
  FiBellOff,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiInfo,
  FiX,
} from "@/components/ui/icons";
import { BottomSheet, useMediaQuery } from "@/components/mobile/bottom-sheet";
import { useSheetZoom } from "@/components/mobile/gestures";
import { Bot } from "@/components/agents/bot";
import {
  createReminder,
  deleteReminder,
  markNotified,
  toggleDone,
  type Reminder,
} from "@/app/actions/reminders";
import { Ico } from "@/components/ui/ico";
import { useLongPress } from "@/components/mobile/gestures";
import { cn } from "@/lib/utils";

type Permission = "default" | "granted" | "denied" | "unsupported";

const QUICK = [
  { label: "In 1 min", ms: 60_000 },
  { label: "In 10 min", ms: 600_000 },
  { label: "In 1 hour", ms: 3_600_000 },
  { label: "Tomorrow 9am", ms: -1 },
];

function tomorrow9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

function toDateValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const reduceMotionNow = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Mobile "when" picker. The desktop composer keeps its inline datetime-local,
 * but on a phone the cramped native control breaks the one-screen-one-job
 * rule — so the time pick moves into a bottom sheet: quick options in context,
 * custom date/time, confirm/dismiss actions. Everything here just selects;
 * the composer's Add button still does the adding.
 */
function WhenSheet({
  open,
  onClose,
  when,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  when: number;
  onPick: (ts: number) => void;
}) {
  const [date, setDate] = useState(() => toDateValue(when));
  const [time, setTime] = useState(() => toTimeValue(when));
  const options = useMemo(
    () => [
      { label: "In 10 minutes", at: Date.now() + 600_000 },
      { label: "In 1 hour", at: Date.now() + 3_600_000 },
      { label: "Tomorrow at 9:00", at: tomorrow9() },
    ],
    [],
  );
  const customTs = useMemo(() => {
    const t = new Date(`${date}T${time}`).getTime();
    return Number.isFinite(t) ? t : null;
  }, [date, time]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Pick a time"
      subtitle="When should Trove remind you?"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[var(--r-control)] border border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-2 transition active:bg-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={customTs == null}
            onClick={() => {
              if (customTs != null) {
                onPick(customTs);
                onClose();
              }
            }}
            className="flex-1 rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[13.5px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            Set time
          </button>
        </>
      }
    >
      <ul className="-mx-1">
        {options.map((o) => (
          <li key={o.label}>
            <button
              type="button"
              onClick={() => {
                onPick(o.at);
                onClose();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--r-control)] px-3.5 py-3 text-left transition active:bg-hover"
            >
              <span className="flex items-center gap-2.5 text-[14.5px] text-ink">
                <Ico icon={FiClock} motion="spin" size={14} className="shrink-0 text-ink-4" />
                {o.label}
              </span>
              <span className="shrink-0 text-[12.5px] text-ink-4">{formatDue(o.at)}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-4">
        Custom
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Reminder date"
          className="h-11 min-w-0 flex-1 rounded-[var(--r-control)] border border-line-strong bg-sunk px-3 text-[13.5px] text-ink outline-none focus:border-accent"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Reminder time"
          className="h-11 w-[118px] shrink-0 rounded-[var(--r-control)] border border-line-strong bg-sunk px-3 text-[13.5px] text-ink outline-none focus:border-accent"
        />
      </div>
    </BottomSheet>
  );
}

function formatDue(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

/** Notification.permission is external browser state. Re-check on focus/visibility
 *  instead of polling — it only changes when the user answers the prompt. */
function subscribePermission(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function readPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as Permission;
}

export function RemindersView({
  initial,
  signedIn,
}: {
  initial: Reminder[];
  signedIn: boolean;
}) {
  const [added, setAdded] = useState<Reminder[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [toggled, setToggled] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<number>(() => Date.now() + 600_000);
  const [error, setError] = useState<string | null>(null);
  const [fired, setFired] = useState<Reminder[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [, startTransition] = useTransition();
  const seen = useRef(new Set<string>());
  const titleRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetZoom = useSheetZoom(sheetOpen);
  const [showTip, setShowTip] = useState(true);
  const coarse = useMediaQuery("(pointer: coarse)");

  const permission = useSyncExternalStore(
    subscribePermission,
    readPermission,
    () => "default" as Permission,
  );

  // Derived, not mirrored in state — server data stays the source of truth.
  // Optimistic additions are deduped away once the server round-trip returns
  // the same row.
  const reminders = useMemo(() => {
    const byId = new Map<string, Reminder>();
    for (const r of [...added, ...initial]) byId.set(r.id, r);
    return [...byId.values()]
      .filter((r) => !removed.includes(r.id))
      .map((r) => (r.id in toggled ? { ...r, done: toggled[r.id] } : r))
      .sort((a, b) => a.due_at - b.due_at);
  }, [initial, added, removed, toggled]);

  /* the reminder loop — one clock drives both firing and "overdue" styling.
     Pauses while the tab is hidden (no visible UI to update). */
  useVisibleInterval(() => setNow(Date.now()), 10_000);

  useEffect(() => {
    const due = reminders.filter(
      (r) => !r.done && !r.notified && !seen.current.has(r.id) && r.due_at <= now,
    );
    if (due.length === 0) return;

    for (const r of due) {
      seen.current.add(r.id);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification("Trove reminder", { body: r.title, tag: r.id });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
      void markNotified(r.id);
    }
    setFired((f) => [...f, ...due]);
  }, [reminders, now]);

  async function ask() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    if (p === "granted") {
      new Notification("Notifications on", {
        body: "Trove will remind you here.",
      });
    }
  }

  function add(dueAt: number) {
    if (!title.trim()) {
      setError("Give the reminder a title first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReminder({ title, dueAt });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAdded((a) => [
        ...a,
        { id: res.id!, title, note: "", due_at: dueAt, done: 0, notified: 0 },
      ]);
      setTitle("");
    });
  }

  const pending = reminders.filter((r) => !r.done);
  const complete = reminders.filter((r) => r.done);

  // Long-press a reminder row on touch devices: toggle done / delete with a
  // blurred backdrop and a slight zoom on the row.
  const lp = useLongPress({
    actions: (id) => {
      const target = reminders.find((x) => x.id === id);
      const done = target ? Boolean(target.done) : false;
      return [
        {
          id: "toggle",
          label: done ? "Mark not done" : "Mark done",
          icon: FiCheck,
          onSelect: (rid) => {
            setToggled((t) => ({ ...t, [rid]: done ? 0 : 1 }));
            void toggleDone(rid);
          },
        },
        {
          id: "delete",
          label: "Delete",
          icon: FiTrash2,
          destructive: true,
          onSelect: (rid) => {
            setRemoved((x) => [...x, rid]);
            void deleteReminder(rid);
          },
        },
      ];
    },
  });

  if (!signedIn) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-5 text-center">
        <Bot size={68} accent="#fbbf24" />
        <h1 className="mt-6 text-[22px] font-semibold text-ink">Reminders</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Tell Trove what to remind you about and it will notify you.
        </p>
        <Link
          href="/login"
          className="mt-7 rounded-[var(--r-control)] btn-grad px-5 py-2.5 text-[14px] font-medium transition-transform hover:scale-105"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div {...sheetZoom.backgroundProps} className="nx-in mx-auto min-h-screen max-w-[720px] px-5 py-10 lg:px-8">
      <h1 className="text-[24px] font-semibold text-ink">Reminders</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-3">
        {pending.length} pending · notifications fire while Trove is open in a tab.
      </p>

      {/* permission */}
      {permission !== "granted" ? (
        <div
          className={cn(
            "mt-5 flex flex-wrap items-center gap-3 rounded-[var(--r-panel)] border px-4 py-3",
            permission === "denied" || permission === "unsupported"
              ? "border-critical/25 bg-critical/8"
              : "border-caution/25 bg-caution/8",
          )}
        >
          {permission === "denied" || permission === "unsupported" ? (
            <Ico icon={FiBellOff} motion="ring" size={16} className="shrink-0 text-critical" />
          ) : (
            <Ico icon={FiBell} motion="ring" size={16} className="shrink-0 text-caution" />
          )}
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
            {permission === "unsupported"
              ? "This browser does not support notifications. Reminders still appear in the app."
              : permission === "denied"
                ? "Notifications are blocked for this site. Re-enable them in your browser settings — reminders still appear in the app."
                : "Allow notifications and reminders will pop up even when this tab is in the background."}
          </p>
          {permission === "default" ? (
            <button
              onClick={ask}
              className="shrink-0 rounded-[var(--r-control)] btn-grad px-3.5 py-2 text-[13px] font-medium transition-transform hover:scale-[1.03]"
            >
              Enable
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-positive">
          <Ico icon={FiBell} motion="ring" size={14} /> Notifications enabled
        </p>
      )}

      {/* composer */}
      <div className="mt-6 rounded-[var(--r-panel)] border border-line bg-rail p-4">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add(when);
          }}
          placeholder="Remind me to…"
          aria-label="Reminder title"
          className="h-11 w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                const due = q.ms === -1 ? tomorrow9() : Date.now() + q.ms;
                setWhen(due);
                add(due);
              }}
              className="chip group !px-3 !py-1.5 !text-[12.5px]"
            >
              <Ico icon={FiClock} motion="spin" size={12} /> {q.label}
            </button>
          ))}

          {coarse ? (
            <>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                className="chip group !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiClock} motion="spin" size={12} /> {formatDue(when)}
              </button>
              <button
                onClick={() => add(when)}
                className="ml-auto flex items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 py-1.5 text-[12.5px] font-medium"
              >
                <Ico icon={FiPlus} motion="open" size={12} /> Add
              </button>
              <WhenSheet
                key={String(sheetOpen)}
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                when={when}
                onPick={setWhen}
              />
            </>
          ) : (
            <label className="ml-auto flex items-center gap-2 text-[12.5px] text-ink-3">
              <input
                type="datetime-local"
                onChange={(e) => setWhen(new Date(e.target.value).getTime())}
                className="rounded-[var(--r-chip)] border border-line-strong bg-sunk px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent"
              />
              <button
                onClick={() => add(when)}
                className="flex items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 py-1.5 text-[12.5px] font-medium"
              >
                <Ico icon={FiPlus} motion="open" size={12} /> Add
              </button>
            </label>
          )}
        </div>

        {error ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-critical">
            <Ico icon={FiAlertCircle} motion="pop" size={12} /> {error}
          </p>
        ) : null}
      </div>

      {/* list */}
      {pending.length === 0 && complete.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--r-panel)] border border-dashed border-line-strong px-6 py-14 text-center">
          <Bot size={72} accent="#fbbf24" />
          <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-ink">
            Nothing scheduled yet
          </h2>
          <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-3">
            Type what to remember above, pick a time, and Trove will notify you here —
            even when this tab is in the background.
          </p>
          <button
            type="button"
            onClick={() => {
              titleRef.current?.scrollIntoView({
                block: "center",
                behavior: reduceMotionNow() ? "auto" : "smooth",
              });
              titleRef.current?.focus({ preventScroll: true });
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full btn-grad px-5 py-2.5 text-[13.5px] font-semibold transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Ico icon={FiPlus} motion="open" size={15} /> New reminder
          </button>
          {showTip ? (
            <div
              role="note"
              className="mt-5 flex w-full max-w-[400px] items-start gap-2.5 rounded-[var(--r-control)] border border-line bg-sunk px-3.5 py-2.5 text-left"
            >
              <Ico icon={FiInfo} motion="pop" size={14} className="mt-0.5 shrink-0 text-accent" />
              <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-3">
                Tip: the quick chips set a reminder in one tap — no typing needed.
              </p>
              <button
                type="button"
                onClick={() => setShowTip(false)}
                aria-label="Dismiss tip"
                className="shrink-0 rounded-full p-1 text-ink-4 transition hover:text-ink"
              >
                <FiX size={13} />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {[...pending, ...complete].map((r) => {
            const overdue = !r.done && r.due_at <= now;
            return (
              <li
                key={r.id}
                {...lp.itemProps(r.id)}
                className={cn(
                  "nx-in flex items-center gap-3 rounded-[var(--r-panel)] border px-4 py-3",
                  r.done
                    ? "border-line bg-rail opacity-55"
                    : overdue
                      ? "border-caution/35 bg-caution/8"
                      : "border-line bg-rail",
                )}
              >
                <button
                  onClick={() => {
                    setToggled((t) => ({ ...t, [r.id]: r.done ? 0 : 1 }));
                    void toggleDone(r.id);
                  }}
                  aria-label={r.done ? "Mark not done" : "Mark done"}
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-[var(--r-chip)] border transition-colors",
                    r.done
                      ? "border-positive bg-positive text-canvas"
                      : "border-line-strong hover:border-ink-3",
                  )}
                >
                  {r.done ? <Ico icon={FiCheck} motion="check" size={12} /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[14px]",
                      r.done ? "text-ink-4 line-through" : "text-ink",
                    )}
                  >
                    {r.title}
                  </p>
                  <p className="text-[12px] text-ink-4">
                    {formatDue(r.due_at)}
                    {overdue ? " · due" : ""}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setRemoved((x) => [...x, r.id]);
                    void deleteReminder(r.id);
                  }}
                  aria-label={`Delete ${r.title}`}
                  className="shrink-0 rounded-[var(--r-chip)] p-1.5 text-ink-4 transition-colors hover:bg-hover hover:text-critical"
                >
                  <Ico icon={FiTrash2} motion="shake" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* in-app toasts, so a reminder is never missed if notifications are off */}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(340px,calc(100vw-40px))] flex-col gap-2">
        {fired.map((r) => (
          <div
            key={r.id}
            className="nx-in flex items-start gap-3 rounded-[var(--r-panel)] border border-caution/40 bg-raised px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          >
            <Bot size={32} accent="#fbbf24" state="working" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] uppercase tracking-[0.06em] text-caution">
                Reminder
              </p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-ink">{r.title}</p>
            </div>
            <button
              onClick={() => setFired((f) => f.filter((x) => x.id !== r.id))}
              aria-label="Dismiss"
              className="shrink-0 rounded-[var(--r-chip)] p-1 text-ink-4 hover:text-ink"
            >
              <Ico icon={FiX} motion="shake" size={14} />
            </button>
          </div>
        ))}
      </div>

      {lp.menu}
    </div>
  );
}
