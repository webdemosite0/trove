"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./builder-activity.module.css";

export type BuilderActivityKind =
  | "thinking"
  | "searching"
  | "planning"
  | "reading"
  | "writing"
  | "command"
  | "tool"
  | "preview"
  | "saving"
  | "done"
  | "error";

export type BuilderActivity = {
  id: string;
  kind: BuilderActivityKind;
  label: string;
  detail?: string | null;
  state?: "active" | "done" | "error";
  at: number;
  variant?: number;
};

const KIND_LABEL: Record<BuilderActivityKind, string> = {
  thinking: "Thinking",
  searching: "Searching",
  planning: "Planning",
  reading: "Reading",
  writing: "Writing",
  command: "Ran command",
  tool: "Using tool",
  preview: "Preview",
  saving: "Saving",
  done: "Done",
  error: "Error",
};

function useElapsed(active: boolean, startedAt?: number | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) {
      setSecs(0);
      return;
    }
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, startedAt]);
  return secs;
}

export function BuilderActivityFeed({
  items,
  active,
  startedAt,
  className,
}: {
  items: BuilderActivity[];
  active: boolean;
  startedAt?: number | null;
  className?: string;
}) {
  const elapsed = useElapsed(active, startedAt);
  const visible = useMemo(() => items.slice(-18), [items]);
  const current = [...visible].reverse().find((item) => item.state === "active") ?? visible.at(-1);

  if (!visible.length && !active) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[22px] border border-black/[0.07] bg-white/72 shadow-[0_18px_50px_-38px_rgba(15,23,42,.42)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-black/[0.055] px-4 py-3.5">
        <ThinkingOrb
          kind={current?.kind ?? "thinking"}
          variant={current?.variant ?? visible.length}
          active={active}
          size={25}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-[#18181a]">
            {active ? current?.label || "Trove is working" : "Work complete"}
          </p>
          <p className="mt-0.5 text-[10.5px] text-black/40">
            {active ? `Working for ${formatElapsed(elapsed)}` : `${visible.length} actions completed`}
          </p>
        </div>
        {active ? (
          <span className="rounded-full bg-[#111]/[0.055] px-2 py-1 text-[9.5px] font-medium text-black/48">
            live
          </span>
        ) : null}
      </div>

      <div className="max-h-[320px] overflow-y-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item, index) => (
          <ActivityRow key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ item, index }: { item: BuilderActivity; index: number }) {
  const state = item.state ?? "done";
  return (
    <div
      className={cn(styles.enter, "group flex items-start gap-2.5 rounded-[14px] px-2.5 py-2 transition hover:bg-black/[0.025]")}
      style={{ animationDelay: `${Math.min(index * 18, 140)}ms` }}
    >
      <div className="mt-0.5 grid size-[22px] shrink-0 place-items-center">
        {state === "active" ? (
          <ThinkingOrb kind={item.kind} variant={item.variant ?? index} active size={20} />
        ) : state === "error" || item.kind === "error" ? (
          <span className="grid size-[18px] place-items-center rounded-full border border-red-500/20 bg-red-500/[0.07] text-[10px] font-semibold text-red-500">!</span>
        ) : (
          <span className="grid size-[18px] place-items-center rounded-full border border-black/[0.07] bg-black/[0.025] text-[9px] text-black/44">✓</span>
        )}
      </div>

      <div className="min-w-0 flex-1 pt-px">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-[10.5px] font-medium text-black/36">{KIND_LABEL[item.kind]}</span>
          <span className={cn(
            "min-w-0 truncate text-[12px] text-[#2a292d]",
            (item.kind === "command" || item.kind === "reading" || item.kind === "writing") && "font-mono text-[11px]",
          )}>
            {item.label}
          </span>
        </div>
        {item.detail ? <p className="mt-0.5 truncate text-[10.5px] text-black/35">{item.detail}</p> : null}
      </div>
    </div>
  );
}

export function ThinkingOrb({
  kind = "thinking",
  variant = 0,
  active = true,
  size = 22,
}: {
  kind?: BuilderActivityKind;
  variant?: number;
  active?: boolean;
  size?: number;
}) {
  // 12 base geometries × 10 rhythm/rotation parameter sets = 120 distinct
  // deterministic premium motion variants without a heavyweight animation runtime.
  const normalized = ((variant % 120) + 120) % 120;
  const geometry = normalized % 12;
  const rhythm = Math.floor(normalized / 12);
  const speed = 1.05 + rhythm * 0.085;
  const delay = -(geometry * 0.071 + rhythm * 0.037);
  const rotate = (normalized * 17) % 360;

  return (
    <span
      className={cn(styles.orb, !active && "opacity-45")}
      data-geometry={geometry}
      data-kind={kind}
      aria-hidden
      style={
        {
          width: size,
          height: size,
          "--orb-speed": `${speed}s`,
          "--orb-delay": `${delay}s`,
          "--orb-rotate": `${rotate}deg`,
        } as CSSProperties
      }
    >
      <span className={styles.core} />
      <span className={cn(styles.ring, styles.ringA)} />
      <span className={cn(styles.ring, styles.ringB)} />
      <span className={cn(styles.dot, styles.dotA)} />
      <span className={cn(styles.dot, styles.dotB)} />
      <span className={styles.scan} />
    </span>
  );
}

function formatElapsed(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
