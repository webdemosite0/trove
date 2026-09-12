"use client";

import { TroveOrb } from "@/components/brand/orb";
import { ServiceMark } from "@/components/integrations/service-mark";
import { cn } from "@/lib/utils";

/** Pure chat process line — Grok-style Ran command / Wrote / Used */
export function ProcessRow({
  kind,
  label,
  active,
  connectorId,
}: {
  kind: "cmd" | "file" | "think" | "tool" | "ok" | "connect";
  label: string;
  active?: boolean;
  /** When set, shows brand mark (e.g. github) for Used / Connected rows */
  connectorId?: string;
}) {
  const id =
    connectorId ??
    (kind === "tool" || kind === "connect"
      ? label.match(/\b(github|vercel|figma|slack|notion|linear|supabase|gmail|netlify|gitlab|stripe)\b/i)?.[1]
      : undefined);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-[4px] text-[13.5px] leading-snug",
        active ? "text-ink-2" : "text-ink-4",
      )}
    >
      <span
        className={cn(
          "mt-[1px] grid size-[20px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-white/[0.06] bg-white/[0.04] text-[11px]",
          kind === "ok" && "border-positive/30 text-positive",
          kind === "tool" && "border-accent/25 text-accent",
          active && "border-accent/20 text-accent",
        )}
        aria-hidden
      >
        {id ? (
          <ServiceMark id={id} name={id} size={16} />
        ) : kind === "cmd" || kind === "connect" ? (
          "▸"
        ) : kind === "file" ? (
          "⊞"
        ) : kind === "tool" ? (
          "◎"
        ) : kind === "ok" ? (
          "✓"
        ) : (
          "○"
        )}
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
            {!/\bconnector\b/i.test(label) && id ? (
              <span className="text-ink-4"> Connector</span>
            ) : null}
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
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return (
    <div className="flex items-center gap-2 pl-1 pt-2">
      <TroveOrb size={14} state="thinking" />
      <span className="text-[12px] tabular-nums text-ink-4">Working for {label}</span>
    </div>
  );
}
