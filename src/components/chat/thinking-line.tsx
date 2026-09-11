"use client";

import { useEffect, useState } from "react";
import { TroveOrb } from "@/components/brand/orb";

const STEPS = [
  "Reading your message",
  "Checking connected tools",
  "Planning the reply",
  "Writing the answer",
];

/**
 * Live thinking strip — open layout, not a card/box.
 * Matches the progressive "Working for Ns" timeline style.
 */
export function ThinkingLine({ labels }: { labels?: string[] }) {
  const lines = labels?.length ? labels : STEPS;
  const [started] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => (s + 1) % lines.length);
    }, 2200);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div className="nx-in flex items-start gap-3 pl-0">
      <span className="nx-thinking relative mt-0.5 grid place-items-center">
        <TroveOrb size={24} state="thinking" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{lines[step]}</p>
        <p className="mt-0.5 text-[12px] tabular-nums text-accent">Working for {secs}s</p>
        <ul className="mt-2 space-y-1 border-l border-line pl-3">
          {lines.slice(0, step + 1).map((l, i) => (
            <li
              key={`${l}-${i}`}
              className="text-[12.5px] text-ink-3"
              style={{ animationDelay: `${i * 40}ms" }}
            >
              {i < step ? (
                <span className="text-positive">✓ </span>
              ) : (
                <span className="text-accent">● </span>
              )}
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
