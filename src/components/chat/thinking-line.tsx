"use client";

import { useEffect, useState } from "react";
import { ThinkingOrb } from "@/components/ui/thinking-orbs-compat";
import { ProcessRow, WorkingTimer } from "@/components/builder/process-row";

type Step = {
  kind: "think" | "cmd" | "connect" | "file" | "ok";
  label: string;
  connectorId?: string;
};

type OrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

const DEFAULT_STEPS: Step[] = [
  { kind: "think", label: "Exploring your request" },
  { kind: "cmd", label: "Planning the answer" },
  { kind: "connect", label: "", connectorId: "github" },
  { kind: "think", label: "Writing the response" },
];

function orbForStep(s: Step | undefined): OrbState {
  if (!s) return "working";
  const lower = `${s.label} ${s.connectorId ?? ""}`.toLowerCase();
  if (s.kind === "connect" || lower.includes("connect")) return "connecting";
  if (lower.includes("search") || lower.includes("explor")) return "searching";
  if (lower.includes("plan")) return "solving";
  if (lower.includes("writ") || lower.includes("compos")) return "composing";
  if (s.kind === "cmd") return "weaving";
  if (s.kind === "file") return "shaping";
  return "working";
}

/**
 * Live thinking strip — process rows + ThinkingOrb.
 */
export function ThinkingLine({ labels }: { labels?: string[] }) {
  const steps: Step[] = labels?.length
    ? labels.map((label, i) => {
        const lower = label.toLowerCase();
        if (lower.includes("github"))
          return { kind: "connect" as const, label: "", connectorId: "github" };
        if (lower.includes("vercel"))
          return { kind: "connect" as const, label: "", connectorId: "vercel" };
        if (lower.includes("command") || lower.includes("ran"))
          return { kind: "cmd" as const, label };
        return {
          kind: (i === 1 ? "cmd" : "think") as Step["kind"],
          label,
        };
      })
    : DEFAULT_STEPS;

  const [started] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 2600);
    return () => clearInterval(t);
  }, [steps.length]);

  const current = steps[step];
  const orbState = orbForStep(current);

  return (
    <div className="nx-in flex items-start gap-3">
      <span className="relative mt-0.5 grid shrink-0 place-items-center" aria-hidden>
        <ThinkingOrb state={orbState} size={64} theme="auto" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        {steps.slice(0, step + 1).map((s, i) => (
          <ProcessRow
            key={`${s.kind}-${s.label}-${s.connectorId ?? ""}-${i}`}
            kind={s.kind}
            label={s.label}
            connectorId={s.connectorId}
            active={i === step}
          />
        ))}
        <WorkingTimer secs={secs} orbState={orbState} />
      </div>
    </div>
  );
}
