"use client";

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

/**
 * Lightweight compatibility component for older Trove UI that imported the
 * thinking-orbs package. It intentionally has no dependency on the newer
 * agentic-builder activity system so the original builder can stand alone.
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
  const speed = state === "searching" || state === "solving" ? "0.9s" : "1.35s";

  return (
    <span
      aria-hidden
      className="relative inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, opacity: active ? 1 : 0.5 }}
    >
      <span
        className="absolute inset-[8%] rounded-full border border-current/20"
        style={{ animation: active ? `spin ${speed} linear infinite` : undefined }}
      />
      <span className={active ? "absolute inset-[27%] animate-pulse rounded-full bg-current/65" : "absolute inset-[27%] rounded-full bg-current/45"} />
      <span className="absolute left-1/2 top-[3%] size-[18%] -translate-x-1/2 rounded-full bg-current/80" />
    </span>
  );
}
