"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * FILTER TABLE — agent task table with status chips
 * ───────────────────────────────────────────────────────── */

export type FilterStatus = "todo" | "progress" | "done";

export type FilterTableRow = {
  task: string;
  date: string;
  status: FilterStatus;
  owner: string;
};

export type FilterTableLabels = {
  columns: { task: string; date: string; status: string; owner: string };
};

const DEFAULT_LABELS: FilterTableLabels = {
  columns: {
    task: "Task name",
    date: "Date",
    status: "Status",
    owner: "Owner",
  },
};

const STATUS_META: Record<
  FilterStatus,
  { label: string; dot: string; pill: string }
> = {
  todo: {
    label: "To do",
    dot: "#f09a2f",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  progress: {
    label: "In Progress",
    dot: "#16a6c7",
    pill: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  },
  done: {
    label: "Completed",
    dot: "#25a878",
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
};

export function FilterTable({
  rows,
  labels = DEFAULT_LABELS,
  className,
  onRowClick,
}: {
  rows: FilterTableRow[];
  labels?: FilterTableLabels;
  className?: string;
  onRowClick?: (row: FilterTableRow) => void;
}) {
  const [filter, setFilter] = useState<"all" | FilterStatus>("all");

  const counts = useMemo(() => {
    const c = { all: rows.length, todo: 0, progress: 0, done: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filters: { key: "all" | FilterStatus; label: string; dot?: string; count: number }[] =
    [
      { key: "all", label: "All", count: counts.all },
      { key: "todo", label: "To do", dot: STATUS_META.todo.dot, count: counts.todo },
      {
        key: "progress",
        label: "In Progress",
        dot: STATUS_META.progress.dot,
        count: counts.progress,
      },
      { key: "done", label: "Completed", dot: STATUS_META.done.dot, count: counts.done },
    ];

  if (!rows.length) {
    return (
      <div className={cn("rounded-[var(--r-card,16px)] border border-line bg-raised p-6 text-center text-[13px] text-ink-3", className)}>
        No tasks yet
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-[26.25rem]", className)}>
      <div
        className="-mx-1 mb-1 flex items-center gap-1 overflow-x-auto px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-[background-color,box-shadow,color] duration-200",
                active
                  ? "bg-raised text-ink shadow-sm ring-1 ring-line"
                  : "text-ink-2 hover:bg-hover",
              )}
            >
              {f.dot ? (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: f.dot }}
                />
              ) : null}
              {f.label}
              <span
                className={cn(
                  "rounded-[4px] px-1 text-[10.5px] tabular-nums",
                  active ? "bg-sunk text-ink-2" : "text-ink-3",
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-label="Scrollable task table"
        className="overflow-x-auto rounded-[var(--r-card,16px)] border border-line bg-raised shadow-sm"
        role="region"
        tabIndex={0}
        style={{ scrollbarWidth: "none" }}
      >
        <div className="min-w-[420px]">
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.6fr)_minmax(0,0.95fr)_minmax(0,0.9fr)] border-b border-line text-[12.5px] font-medium text-ink-2">
            <span className="border-r border-line px-3 py-2">{labels.columns.task}</span>
            <span className="border-r border-line px-3 py-2">{labels.columns.date}</span>
            <span className="border-r border-line px-3 py-2">{labels.columns.status}</span>
            <span className="px-3 py-2">{labels.columns.owner}</span>
          </div>

          {rows.map((row) => {
            const shown = filter === "all" || row.status === filter;
            const meta = STATUS_META[row.status];
            return (
              <div
                key={`${row.task}-${row.date}-${row.owner}`}
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: shown ? "1fr" : "0fr",
                  opacity: shown ? 1 : 0,
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              >
                <div className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onRowClick?.(row)}
                    className="grid w-full grid-cols-[minmax(0,1.3fr)_minmax(0,0.6fr)_minmax(0,0.95fr)_minmax(0,0.9fr)] border-b border-line text-left text-[13px] transition-colors duration-100 hover:bg-hover"
                  >
                    <span className="flex min-w-0 items-center border-r border-line px-3 py-2">
                      <span className="truncate font-medium text-ink">{row.task}</span>
                    </span>
                    <span className="flex items-center whitespace-nowrap border-r border-line px-3 py-2 tabular-nums text-ink-2">
                      {row.date}
                    </span>
                    <span className="flex items-center border-r border-line px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex h-[23px] shrink-0 items-center whitespace-nowrap rounded-[8px] border px-[7px] text-[12px] font-medium",
                          meta.pill,
                        )}
                      >
                        {meta.label}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center px-3 py-2 text-ink-2">
                      <span className="truncate">{row.owner}</span>
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FilterTable;
