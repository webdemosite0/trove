"use client";

import { cn } from "@/lib/utils";
import { TroveOrb, type OrbState } from "@/components/brand/orb";

/**
 * TROVE wordmark — geometric display weight with a live gradient fill.
 * Pairs with TroveOrb as BrandLockup for nav / splash.
 */
export function Wordmark({
  className,
  size = 64,
  sweep = true,
}: {
  className?: string;
  size?: number;
  /** Slow light sweep across the letters. Off wherever something else moves. */
  sweep?: boolean;
}) {
  return (
    <span
      className={cn("wordmark-gradient block leading-none tracking-tight", sweep && "nx-sweep-text", className)}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "0.02em",
      }}
    >
      TROVE
    </span>
  );
}

/**
 * Full brand lockup: animated orb + wordmark.
 * Use in nav, splash, auth cards, mobile header.
 */
export function BrandLockup({
  className,
  orbSize = 28,
  wordSize = 22,
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
