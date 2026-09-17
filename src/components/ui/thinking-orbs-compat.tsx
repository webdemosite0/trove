"use client";

import {
  ThinkingOrb as TroveThinkingOrb,
  type BuilderActivityKind,
} from "@/components/builder/builder-activity";

type LegacyOrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping"
  | string;

const KIND_BY_STATE: Record<string, BuilderActivityKind> = {
  working: "thinking",
  searching: "searching",
  solving: "planning",
  listening: "thinking",
  connecting: "tool",
  weaving: "command",
  composing: "writing",
  breathing: "thinking",
  shaping: "writing",
};

/**
 * Compatibility adapter for older Trove components that imported the
 * thinking-orbs package. They now use the same internal 120-variant orb engine
 * as the agentic builder without changing each call site.
 */
export function ThinkingOrb({
  state = "working",
  size = 22,
  active = true,
}: {
  state?: LegacyOrbState;
  size?: number;
  theme?: "auto" | "light" | "dark";
  active?: boolean;
}) {
  const kind = KIND_BY_STATE[state] ?? "thinking";
  const variant = stableVariant(state);
  return <TroveThinkingOrb kind={kind} variant={variant} active={active} size={size} />;
}

function stableVariant(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % 120;
}
