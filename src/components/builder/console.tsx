"use client";

import { useEffect, useRef } from "react";
import { FiTrash2, FiTerminal } from "@/components/ui/icons";
import type { LogLine } from "@/lib/builder";
import { cn } from "@/lib/utils";

export function BuildConsole({
  lines,
  onClear,
  className,
}: {
  lines: LogLine[];
  onClear?: () => void;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed]", className)}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#141416] px-3">
        <FiTerminal size={13} className="text-white/45" />
        <span className="text-[12px] font-medium tracking-tight text-white/80">Console</span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-white/40">
          {lines.length}
        </span>
        <span className="flex-1" />
        {onClear && lines.length ? (
          <button
            type="button"
            onClick={onClear}
            className="grid size-7 place-items-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Clear console"
          >
            <FiTrash2 size={13} />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-[1.65]">
        {lines.length === 0 ? (
          <p className="text-white/35">
            <span className="text-emerald-400/80">$</span> waiting for build output…
          </p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="flex gap-3">
              <span className="shrink-0 select-none text-white/25 tabular-nums">{l.at}</span>
              <span
                className={cn(
                  "min-w-0 flex-1 whitespace-pre-wrap break-words",
                  l.level === "warn"
                    ? "text-amber-300/90"
                    : l.level === "ok"
                      ? "text-emerald-400/90"
                      : "text-white/70",
                )}
              >
                {l.level === "ok" ? (
                  <span className="mr-1.5 text-emerald-500/70">✓</span>
                ) : l.level === "warn" ? (
                  <span className="mr-1.5 text-amber-500/70">!</span>
                ) : (
                  <span className="mr-1.5 text-white/25">·</span>
                )}
                {l.text}
              </span>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
