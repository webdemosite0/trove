"use client";

import { useEffect, useId, useMemo, useState } from "react";

type OrbState =
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
 * Trove-owned ThinkingOrb — visual stand-in for libraries.dev thinking-orbs.
 * Tuned for chat-avatar (64) and inline (20) scales used in the AI builder.
 */
export function ThinkingOrb({
  state = "working",
  size = 22,
  speed = 1,
  dark,
  theme = "auto",
  paused = false,
  active = true,
}: {
  state?: OrbState;
  size?: number;
  speed?: number;
  dark?: boolean;
  theme?: "auto" | "light" | "dark";
  paused?: boolean;
  active?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [tick, setTick] = useState(0);

  const isDark = dark === true || theme === "dark";

  useEffect(() => {
    if (paused || !active) return;
    const ms = Math.max(16, 40 / Math.max(0.25, speed));
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [paused, active, speed]);

  const dots = useMemo(() => {
    const n = size >= 40 ? 14 : size >= 28 ? 11 : 8;
    const t = tick * 0.045 * speed;
    const statePhase =
      state === "searching"
        ? 1.35
        : state === "solving"
          ? 1.15
          : state === "composing" || state === "weaving"
            ? 0.95
            : state === "breathing"
              ? 0.55
              : state === "connecting"
                ? 1.25
                : 1;

    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + t * statePhase;
      const orbit =
        0.28 +
        0.12 * Math.sin(t * 1.4 + i * 0.7) +
        (state === "searching" ? 0.06 * Math.sin(t * 3 + i) : 0);
      const r = 0.04 + 0.035 * (0.55 + 0.45 * Math.sin(t * 2.1 + i * 1.1));
      const ink = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.9));
      return {
        x: 0.5 + Math.cos(a) * orbit,
        y: 0.5 + Math.sin(a) * orbit,
        r,
        ink,
      };
    });
  }, [tick, size, speed, state]);

  const fill = isDark ? "#e2e8f0" : "#1e1b4b";
  const glow = isDark ? "rgba(165,180,252,0.35)" : "rgba(99,102,241,0.28)";

  return (
    <span
      aria-hidden
      className="relative inline-grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        opacity: active ? 1 : 0.45,
        filter: active ? `drop-shadow(0 0 ${Math.max(2, size * 0.12)}px ${glow})` : undefined,
      }}
    >
      <svg viewBox="0 0 1 1" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`orb-core-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.22" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0.5" cy="0.5" r="0.42" fill={`url(#orb-core-${uid})`} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={fill} opacity={d.ink} />
        ))}
      </svg>
    </span>
  );
}
