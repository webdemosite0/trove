"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PreviewDestination = "chat" | "files" | "code" | "preview";

/**
 * Trove preview chrome — tabs switch Preview / Files / Code.
 */
export function BrowserFrame({
  children,
  onOpen,
  onRefresh,
  onNavigate,
  publishControl,
  url,
  status,
  activeTab = "preview",
  className,
}: {
  url?: string | null;
  children: ReactNode;
  onOpen?: () => void;
  onRefresh?: () => void;
  onNavigate?: (destination: PreviewDestination) => void;
  publishControl?: ReactNode;
  pageTitle?: string;
  status?: "idle" | "working" | "ready" | "error";
  activeTab?: "preview" | "files" | "code";
  className?: string;
}) {
  const statusLabel =
    status === "error"
      ? "Error"
      : status === "working"
        ? "Building…"
        : status === "ready"
          ? "Live"
          : "Idle";

  const statusTone =
    status === "error"
      ? "text-critical"
      : status === "working"
        ? "text-accent"
        : status === "ready"
          ? "text-positive"
          : "text-ink-4";

  const tabs = [
    ["preview", "Preview"],
    ["files", "Files"],
    ["code", "Code"],
  ] as const;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border border-line bg-canvas",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-rail/80 px-2 sm:px-3">
        <div className="flex items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-canvas p-0.5">
          {tabs.map(([id, label]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate?.(id)}
                className={cn(
                  "h-7 rounded-[calc(var(--r-control)-2px)] px-2.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "bg-raised text-ink shadow-[var(--sh-1)]"
                    : "text-ink-3 hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mx-2 hidden min-w-0 flex-1 items-center gap-2 sm:flex">
          <span className="truncate rounded-[var(--r-chip)] border border-line bg-sunk px-2.5 py-1 font-mono text-[11.5px] text-ink-3">
            {url && url !== "about:blank" ? url : activeTab === "files" ? "Files" : activeTab === "code" ? "Code" : "Preview"}
          </span>
          <span className={cn("shrink-0 text-[11px] font-medium", statusTone)}>
            {statusLabel}
          </span>
        </div>

        <span className="flex-1 sm:hidden" />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="grid size-8 place-items-center rounded-[var(--r-control)] text-ink-3 transition hover:bg-hover hover:text-ink"
            aria-label="Refresh preview"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className="grid size-8 place-items-center rounded-[var(--r-control)] text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-40"
            aria-label="Open in new tab"
            title="Open in new tab"
          >
            <ExternalIcon />
          </button>
          {publishControl ? <div className="ml-0.5">{publishControl}</div> : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-canvas">
        {children}
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6v5h-5M4 18v-5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 8A7 7 0 0 1 19 10.5M16.8 16A7 7 0 0 1 5 13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4h6v6M20 4l-9 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
