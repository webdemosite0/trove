"use client";

import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reasoning effort levels — how much thinking budget the model spends.
 * Low keeps answers short; Extra High uses the full thinking budget.
 *
 * Note: `@aicss/react` does **not** export ReasoningEffort (Pro-only on
 * aicss.dev). This is a Trove-native control with the same product intent.
 */
export type EffortLevel = "low" | "medium" | "high" | "extra";

export const EFFORT_LEVELS: {
  id: EffortLevel;
  label: string;
  blurb: string;
}[] = [
  { id: "low", label: "Low", blurb: "Short answers, minimal thinking" },
  { id: "medium", label: "Medium", blurb: "Balanced depth and speed" },
  { id: "high", label: "High", blurb: "Deeper reasoning" },
  { id: "extra", label: "Extra High", blurb: "Full thinking budget" },
];

const INDEX: Record<EffortLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  extra: 3,
};

export function ReasoningEffort({
  value = "medium",
  onChange,
  disabled = false,
  showLabels = true,
  className,
}: {
  value?: EffortLevel;
  onChange?: (level: EffortLevel) => void;
  disabled?: boolean;
  showLabels?: boolean;
  className?: string;
}) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const idx = INDEX[value] ?? 1;
  const active = EFFORT_LEVELS[idx];

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const next = Math.round(t * (EFFORT_LEVELS.length - 1));
      const level = EFFORT_LEVELS[next].id;
      if (level !== value) onChange?.(level);
    },
    [disabled, onChange, value],
  );

  return (
    <div
      className={cn("w-full max-w-[16rem] select-none", className)}
      data-effort={value}
    >
      {showLabels ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[11.5px] font-medium text-ink-3">Reasoning</span>
          <span
            className={cn(
              "text-[12.5px] font-semibold tabular-nums transition-opacity",
              dragging ? "text-ink" : "text-ink-2",
            )}
          >
            {active.label}
          </span>
        </div>
      ) : null}

      <div
        ref={trackRef}
        role="slider"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={EFFORT_LEVELS.length - 1}
        aria-valuenow={idx}
        aria-valuetext={active.label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "relative h-8 touch-none rounded-full bg-sunk px-1",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          disabled && "pointer-events-none opacity-40",
        )}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(EFFORT_LEVELS.length - 1, idx + 1);
            onChange?.(EFFORT_LEVELS[next].id);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max(0, idx - 1);
            onChange?.(EFFORT_LEVELS[next].id);
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange?.("low");
          } else if (e.key === "End") {
            e.preventDefault();
            onChange?.("extra");
          }
        }}
      >
        {/* fill */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-accent/20 transition-[width] duration-150"
          style={{
            width: `calc(${(idx / (EFFORT_LEVELS.length - 1)) * 100}% - 0px)`,
            maxWidth: "calc(100% - 8px)",
          }}
        />
        {/* ticks */}
        <span className="pointer-events-none absolute inset-x-1 inset-y-0 flex items-center justify-between px-0.5">
          {EFFORT_LEVELS.map((level, i) => (
            <span
              key={level.id}
              className={cn(
                "size-1 rounded-full transition-colors",
                i <= idx ? "bg-accent" : "bg-line",
              )}
            />
          ))}
        </span>
        {/* thumb */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 size-6 -translate-y-1/2 rounded-full",
            "border border-line bg-raised shadow-sm transition-[left,transform] duration-150",
            dragging && "scale-110",
          )}
          style={{
            left: `calc(${(idx / (EFFORT_LEVELS.length - 1)) * 100}% - 12px)`,
          }}
        >
          <span className="absolute inset-[5px] rounded-full bg-accent" />
        </span>
      </div>

      {showLabels ? (
        <div className="mt-1 flex justify-between px-0.5 text-[10.5px] text-ink-4">
          <span>Low</span>
          <span>Extra</span>
        </div>
      ) : null}

      <span id={`${id}-label`} className="sr-only">
        Reasoning effort
      </span>
    </div>
  );
}

export default ReasoningEffort;
