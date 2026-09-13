"use client";

import { cn } from "@/lib/utils";
import { TroveOrb, type OrbState } from "@/components/brand/orb";

/**
 * TROVE wordmark — geometric display weight.
 * Pairs with the vault monogram via BrandLockup.
 */
export function Wordmark({
  className,
  size = 64,
  sweep = true,
}: {
  className?: string;
  size?: number;
  sweep?: boolean;
}) {
  return (
    <span
      className={cn(
        "wordmark-gradient block leading-none",
        sweep && "nx-sweep-text",
        className,
      )}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 750,
        letterSpacing: "0.04em",
      }}
    >
      TROVE
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
  sweep = false,
}: {
  className?: string;
  orbSize?: number;
  wordSize?: number;
  state?: OrbState;
  showWord?: boolean;
  sweep?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TroveOrb size={orbSize} state={state} />
      {showWord ? <Wordmark size={wordSize} sweep={sweep} /> : null}
    </span>
  );
}
