"use client";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Lovable-style browser chrome around the live preview iframe.
 * Soft large-radius bezel, traffic lights, nav controls, and a clean URL pill.
 */
export function BrowserFrame({
  url,
  children,
  onOpen,
  className,
}: {
  url?: string | null;
  children: ReactNode;
  onOpen?: () => void;
  className?: string;
}) {
  const display =
    (url || "localhost")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "") || "localhost";

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-lg",
        className,
      )}
    >
      {/* Top chrome — matches photo browser bar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-black/5 bg-[#f5f5f7] px-3 py-2">
        <div className="flex items-center gap-1.5 pr-1.5">
          <span className="size-[10px] rounded-full bg-[#ff5f57]" />
          <span className="size-[10px] rounded-full bg-[#febc2e]" />
          <span className="size-[10px] rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-0.5 text-[#8e8e93]">
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md hover:bg-black/5"
            aria-label="Back"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3 L5 8 L10 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md hover:bg-black/5"
            aria-label="Forward"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 3 L11 8 L6 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md hover:bg-black/5"
            aria-label="Refresh"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M13 8a5 5 0 1 1-1.4-3.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M13 3.5 V7 H9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/5 bg-white px-3 py-1.5 text-[12.5px] text-[#3c3c43]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-[#8e8e93]"
            aria-hidden
          >
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M2.5 8h11 M8 2.5c1.8 1.8 1.8 9.2 0 11 M8 2.5c-1.8 1.8-1.8 9.2 0 11"
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </svg>
          <span className="truncate font-medium tracking-tight">{display}</span>
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="grid size-7 place-items-center rounded-md text-[#8e8e93] hover:bg-black/5 hover:text-[#3c3c43]"
            aria-label="Open in new tab"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M9 3h4v4 M13 3 L8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 9.5V12.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H6.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md text-[#8e8e93] hover:bg-black/5"
            aria-label="Open"
            tabIndex={-1}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M9 3h4v4 M13 3 L8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 9.5V12.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H6.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}
