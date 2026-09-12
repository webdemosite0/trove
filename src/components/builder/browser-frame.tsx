"use client";

import { cn } from "@/lib/utils";

/**
 * Grok-style browser chrome around previews: tab strip + nav row + content.
 */
export function BrowserFrame({
  url,
  children,
  className,
  onOpen,
}: {
  url?: string | null;
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
}) {
  const host = (url ?? "localhost").replace(/^https?:\/\//, "").slice(0, 64);

  return (
    <div
      className={cn(
        "flex h-full min-h-[480px] w-full flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-[#f6f6f7] px-3">
        <span className="grid size-7 place-items-center rounded-full bg-white text-[13px] shadow-sm ring-1 ring-black/[0.06]">
          🌐
        </span>
        <span className="grid size-7 place-items-center rounded-full bg-transparent text-black/35">＋</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onOpen}
          className="grid size-7 place-items-center rounded-md text-black/40 hover:bg-black/[0.04] hover:text-black/70"
          aria-label="Open external"
          title="Open"
        >
          ↗
        </button>
        <button
          type="button"
          className="grid size-7 place-items-center rounded-md text-black/40 hover:bg-black/[0.04]"
          aria-label="Layout"
        >
          ▤
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-black/[0.06] bg-white px-3">
        <span className="text-black/30">←</span>
        <span className="text-black/30">→</span>
        <span className="text-black/30">↻</span>
        <span className="mx-2 flex-1 truncate rounded-full bg-[#f0f0f2] px-3 py-1 text-center font-mono text-[11px] text-black/50">
          {host || "localhost"}
        </span>
        <span className="text-black/30">↗</span>
        <span className="text-black/30">▤</span>
      </div>
      <div className="min-h-0 flex-1 bg-white">{children}</div>
    </div>
  );
}
