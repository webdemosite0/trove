"use client";

import { cn } from "@/lib/utils";
import { TroveOrb, type OrbState } from "@/components/brand/orb";

/**
 * Trove wordmark — geometric display weight, soft gradient, unique spacing.
 */
export function Wordmark({
  className,
  size = 20,
  sweep = true,
}: {
  className?: string;
  size?: number;
  sweep?: boolean;
}) {
  return (
    <span
      className={cn(
        "wordmark-gradient inline-flex items-center leading-none",
        sweep && "nx-sweep-text",
        className,
      )}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        paddingBottom: "0.04em",
      }}
    >
      Trove
    </span>
  );
}

/** Orb + wordmark lockup for nav, splash, auth. */
export function BrandLockup({
  className,
  orbSize = 28,
  wordSize = 20,
  state = "idle",
  showWord = true,
  showOrb = true,
  sweep = false,
}: {
  className?: string;
  orbSize?: number;
  wordSize?: number;
  state?: OrbState;
  showWord?: boolean;
  showOrb?: boolean;
  sweep?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showOrb ? <TroveOrb size={orbSize} state={state} /> : null}
      {showWord ? <Wordmark size={wordSize} sweep={sweep} /> : null}
    </span>
  );
}
