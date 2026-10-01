"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Animated step-through: steps light up in sequence when scrolled into view. */
export function FeatureWorkflow({
  steps,
  tone,
}: {
  steps: { label: string; detail: string }[];
  tone: string;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          obs.disconnect();
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setActive(steps.length - 1);
            return;
          }
          let i = -1;
          const t = setInterval(() => {
            i += 1;
            if (i >= steps.length) {
              clearInterval(t);
              return;
            }
            setActive(i);
          }, 700);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [steps.length]);

  return (
    <ol ref={ref} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
      {steps.map((s, i) => {
        const lit = i <= active;
        return (
          <li
            key={s.label}
            className={cn(
              "relative flex-1 rounded-2xl border p-4 transition-all duration-500",
              lit ? "border-line bg-raised opacity-100" : "border-line/60 bg-raised/40 opacity-45",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white transition-colors"
                style={{ background: lit ? tone : "var(--line-strong)" }}
              >
                {lit ? <FiCheck size={12} aria-hidden /> : i + 1}
              </span>
              <span className="text-[13.5px] font-semibold text-ink">{s.label}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{s.detail}</p>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-[9px] top-1/2 hidden -translate-y-1/2 text-ink-4 sm:block"
              >
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
