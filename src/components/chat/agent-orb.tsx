"use client";

import { Orb, type OrbVariant } from "@aicss/react/orbs";

/** Map Trove activity states → AICSS lattice/ring variants. */
const STATE_VARIANT: Record<string, OrbVariant> = {
  idle: "G5",
  thinking: "S1",
  working: "S3",
  searching: "S4",
  streaming: "C3",
  finalizing: "S5",
  done: "G5",
  error: "B5",
};

/**
 * AICSS Orb for agent activity indicators.
 * Brand mark stays `TroveOrb`; use this for “thinking / working / searching”.
 */
export function AgentOrb({
  state = "thinking",
  variant,
  size = 20,
  pill = false,
  label,
  className,
}: {
  state?: keyof typeof STATE_VARIANT | string;
  variant?: OrbVariant;
  size?: number;
  pill?: boolean;
  label?: string;
  className?: string;
}) {
  const v = variant ?? STATE_VARIANT[state] ?? "S1";
  return (
    <Orb
      variant={v}
      size={size}
      pill={pill}
      label={label}
      className={className}
    />
  );
}

export { Orb };
export type { OrbVariant };
