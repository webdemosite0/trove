"use client";

import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

/** Pure chat process line — Grok-style Ran command / Wrote / Used */
export function ProcessRow({
  kind,
  label,
  active,
}: {
  kind: "cmd" | "file" | "think" | "tool" | "ok" | "connect";
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-[4px] text-[13.5px] leading-snug",
        active ? "text-ink-2" : "text-ink-4",
      )}
    >
      <span
        className={cn(
          "mt-[1px] grid size-[20px] shrink-0 place-items-center rounded-[6px] border border-white/[0.06] bg-white/[0.04] text-[11px]",
          kind === "ok" && "border-positive/30 text-positive",
          kind === "tool" && "border-accent/25 text-accent",
          active && "border-accent/20 text-accent",
        )}
        aria-hidden
      >
        {kind === "cmd" || kind === "connect"
          ? "▸"
          : kind === "file"
            ? "⊞"
            : kind === "tool"
              ? "◎"
              : kind === "ok"
                ? "✓"
                : "○"}
      </span>
      <span className="min-w-0 flex-1 pt-[1px]">
        {kind === "cmd" ? (
          <>
            <span className="text-ink-4">Ran command</span>
            <span className="text-ink-2"> {label}</span>
          </>
        ) : kind === "file" ? (
          <>
            <span className="text-ink-4">Wrote</span>
            <span className="font-mono text-[12.5px] text-ink-2"> {label}</span>
          </>
        ) : kind === "tool" ? (
          <>
            <span className="text-ink-4">Used</span>
            <span className="text-ink-2"> {label}</span>
          </>
        ) : kind === "connect" ? (
          <>
            <span className="text-ink-4">Connected</span>
            <span className="text-ink-2"> {label}</span>
          </>
        ) : (
          <span className={active ? "text-ink-2" : "text-ink-4"}>{label}</span>
        )}
      </span>
    </div>
  );
}

export function WorkingTimer({ secs }: { secs: number }) {
  return (
    <div className="flex items-center gap-2 pl-1 pt-2">
      <TroveOrb size={14} state="thinking" />
      <span className="text-[12px] tabular-nums text-ink-4">Working for {secs}s</span>
    </div>
  );
}
