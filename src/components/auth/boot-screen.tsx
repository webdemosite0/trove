"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TroveOrb } from "@/components/brand/orb";
import { FiCheck } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

const STEPS = ["Signing you in", "Assembling tools", "Opening workspace"];

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/chat";
  if (value.startsWith("/login") || value.startsWith("/signup") || value.startsWith("/launching")) {
    return "/chat";
  }
  return value;
}

export function BootScreen({ next }: { next?: string }) {
  const router = useRouter();
  const dest = safeNext(next);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 520),
      setTimeout(() => setStep(2), 1100),
      setTimeout(() => setStep(3), 1680),
      setTimeout(() => router.replace(dest), 2100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [dest, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-canvas px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[28%] h-[420px] w-[520px] -translate-x-1/2 rounded-full opacity-70 blur-[90px]"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <span className="nx-thinking grid place-items-center">
          <TroveOrb size={52} state="working" />
        </span>
        <p className="mt-6 text-[15px] font-medium tracking-[-0.02em] text-ink">
          Preparing Trove
        </p>

        <ul className="mt-8 w-[220px] space-y-2.5">
          {STEPS.map((label, i) => {
            const done = step > i;
            const live = step === i;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2.5 text-[13.5px] transition-colors duration-300",
                  done || live ? "text-ink" : "text-ink-4",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border",
                    done
                      ? "border-positive bg-positive-soft text-positive"
                      : live
                        ? "border-accent"
                        : "border-line",
                  )}
                >
                  {done ? (
                    <Ico icon={FiCheck} motion="check" size={11} />
                  ) : live ? (
                    <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  ) : null}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
