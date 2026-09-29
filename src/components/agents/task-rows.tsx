"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * TASK ROWS — agent activity list
 * Expandable rows with status badges (done / running / failed).
 * Optional demo sequence for “sequence” rows; real data is static.
 * ───────────────────────────────────────────────────────── */

const TICKS = [600, 900, 2400, 1400, 2400, 600];

function useTick(intervals: number[], enabled: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    if (tick >= intervals.length - 1) return;
    const t = setTimeout(() => setTick((x) => x + 1), intervals[tick]);
    return () => clearTimeout(t);
  }, [tick, intervals, enabled]);
  return tick;
}

function SpinnerRing({
  active,
  children,
}: {
  active?: boolean;
  children?: ReactNode;
}) {
  const size = 24;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: "spin 1.1s linear infinite" } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        {active ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-ink-3)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c * 0.72}`}
          />
        ) : null}
      </svg>
      <span className="relative text-[10.5px] font-semibold tabular-nums text-ink">
        {children}
      </span>
    </span>
  );
}

function Badge({ tone, children }: { tone: "red" | "green"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full text-white",
        tone === "red" ? "bg-rose-500" : "bg-emerald-500",
      )}
      style={{ animation: "pop-in 300ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {children}
    </span>
  );
}

const XIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const CheckIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const RetryIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
  </svg>
);

export type TaskDetail = { label: string; meta: string };

export type TaskRow = {
  key: string;
  label: string;
  amount: string;
  status: "done" | "running" | "failed" | "sequence";
  step?: number;
  details: TaskDetail[];
};

export type TaskRowsLabels = {
  completed: string;
  failed: string;
};

const DEFAULT_LABELS: TaskRowsLabels = {
  completed: "Completed",
  failed: "Failed",
};

export function TaskRows({
  variant = "Capsules",
  rows,
  labels,
  className,
  animateSequence = false,
  onToggleRow,
  onRetry,
}: {
  variant?: "Capsules" | "List" | string;
  rows: TaskRow[];
  labels?: Partial<TaskRowsLabels>;
  className?: string;
  /** Enable the demo fail→done animation for status "sequence" rows */
  animateSequence?: boolean;
  onToggleRow?: (key: string, open: boolean) => void;
  onRetry?: (key: string) => void;
}) {
  const hasSequence = animateSequence && rows.some((r) => r.status === "sequence");
  const tick = useTick(TICKS, hasSequence);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const row2: "pending" | "failed" | "done" =
    tick < 3 ? "pending" : tick === 3 ? "failed" : "done";
  const copy = { ...DEFAULT_LABELS, ...labels };
  const list = variant === "List";

  const badgeFor = (row: TaskRow) => {
    if (row.status === "done") return <Badge tone="green">{CheckIcon}</Badge>;
    if (row.status === "failed") return <Badge tone="red">{XIcon}</Badge>;
    if (row.status === "running")
      return <SpinnerRing active>{row.step}</SpinnerRing>;
    // sequence
    if (!animateSequence) return <SpinnerRing>{row.step}</SpinnerRing>;
    return row2 === "pending" ? (
      <SpinnerRing>{row.step}</SpinnerRing>
    ) : row2 === "failed" ? (
      <Badge tone="red">{XIcon}</Badge>
    ) : (
      <Badge tone="green">{CheckIcon}</Badge>
    );
  };

  const pillFor = (row: TaskRow) => {
    if (row.status === "done")
      return (
        <span className="inline-flex h-[22px] items-center rounded-full bg-emerald-500/10 px-2 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-400">
          {copy.completed}
        </span>
      );
    if (row.status === "failed")
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.(row.key);
          }}
          className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-rose-500/10 px-2 text-[11.5px] font-medium text-rose-600 dark:text-rose-400"
        >
          {copy.failed}
          <span className="flex">{RetryIcon}</span>
        </button>
      );
    if (row.status === "running") return null;
    if (!animateSequence) return null;
    return row2 === "failed" ? (
      <span
        className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-rose-500/10 px-2 text-[11.5px] font-medium text-rose-600 dark:text-rose-400"
        style={{ animation: "fade-in 200ms ease-out both" }}
      >
        {copy.failed}{" "}
        <span style={{ animation: "spin 1.2s linear infinite" }} className="flex">
          {RetryIcon}
        </span>
      </span>
    ) : row2 === "done" ? (
      <span
        className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-400"
        style={{ animation: "fade-in 200ms ease-out both" }}
      >
        {copy.completed}
      </span>
    ) : null;
  };

  if (!rows.length) return null;

  return (
    <div
      className={cn(
        "flex w-full max-w-[27.5rem] flex-col",
        list
          ? "gap-0 self-start overflow-hidden rounded-[var(--r-card,16px)] border border-line bg-raised shadow-sm"
          : "gap-2",
        className,
      )}
    >
      {rows.map((row, i) => {
        const open = manualOpen[row.key] ?? false;
        return (
          <div
            key={row.key}
            className={cn(
              "self-stretch overflow-hidden transition-[border-radius,background-color] duration-300 hover:bg-sunk/60",
              list
                ? "border-b border-line last:border-0"
                : "rounded-[14px] border border-line bg-raised shadow-sm",
            )}
            style={{
              borderRadius: list ? 0 : open ? 14 : 22,
              animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both`,
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => {
                setManualOpen((current) => ({ ...current, [row.key]: !open }));
                onToggleRow?.(row.key, !open);
              }}
              className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {badgeFor(row)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {row.label}
              </span>
              <span className="text-[12.5px] tabular-nums text-ink-2">{row.amount}</span>
              {pillFor(row)}
              <span
                aria-hidden
                className="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300"
                  style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300"
              style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                  <span aria-hidden className="mx-auto h-full w-px bg-line" />
                  <div className="flex flex-col gap-1.5">
                    {row.details.map((d, j) => (
                      <div
                        key={d.label}
                        className="flex items-center justify-between"
                        style={
                          open
                            ? {
                                animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${120 + j * 100}ms both`,
                              }
                            : undefined
                        }
                      >
                        <span className="text-[12px] text-ink-2">{d.label}</span>
                        <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                          {d.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TaskRows;
