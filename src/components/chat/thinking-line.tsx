"use client";

import { useEffect, useState } from "react";
import { AgentOrb } from "@/components/chat/agent-orb";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader + AICSS Orb
 * Drive lattice wavefront with elapsed timer (existing motion),
 * plus the package Orb for the activity glyph.
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

function LoaderGrid({
  delays,
  dur,
  round,
}: {
  delays: (number | null)[];
  dur: number;
  round: boolean;
}) {
  return (
    <span aria-hidden className="grid grid-cols-3 gap-[3px]">
      {delays.map((d, i) => (
        <span
          key={i}
          className={round ? "size-1.5 rounded-full bg-ink" : "size-1.5 rounded-[1px] bg-ink"}
          style={{
            opacity: d == null ? 0.12 : undefined,
            animation:
              d == null
                ? undefined
                : `pixel-on ${dur}ms ease-in-out ${d}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

function useElapsed(running: boolean) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => setMs(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [running]);
  return ms;
}

export function ThinkingLine({
  label = "Thinking",
  showGrid = true,
}: {
  label?: string;
  showGrid?: boolean;
}) {
  const ms = useElapsed(true);
  const sec = (ms / 1000).toFixed(1);

  return (
    <div role="status" className="flex w-fit items-center gap-2.5">
      <AgentOrb state="thinking" size={18} />
      {showGrid ? <LoaderGrid delays={chevron} dur={650} round={false} /> : null}
      <span
        className="bg-clip-text text-[13px] font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--color-ink-3) 35%, var(--color-ink) 50%, var(--color-ink-3) 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{sec}s</span>
    </div>
  );
}

export default ThinkingLine;
