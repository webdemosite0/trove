"use client";

import { cn } from "@/lib/utils";
import "./orb.css";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * Official Trove app mark — black rounded square, white T, soft blue edge glow.
 * Matches the product icon (idle). Motion only for thinking/working states.
 */
export function TroveOrb({
  size = 28,
  state = "idle",
  className,
}: {
  size?: number;
  state?: OrbState;
  className?: string;
}) {
  const pulse = state === "idle" || state === "thinking";
  const busy = state === "thinking" || state === "working";

  const face =
    state === "error"
      ? "#7f1d1d"
      : state === "done"
        ? "#14532d"
        : "#0a0a0b";

  const label = {
    idle: "Trove",
    thinking: "Trove is thinking",
    working: "Trove is working",
    done: "Complete",
    error: "Failed",
  }[state];

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        pulse && "trove-orb-breathe",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {/* Soft blue outer glow — matches the product icon */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-18%] rounded-[28%]"
        style={{
          background:
            state === "error"
              ? "radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)"
              : state === "done"
                ? "radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(99,102,241,0.25) 45%, transparent 72%)",
          filter: "blur(5px)",
          opacity: busy ? 0.95 : 0.85,
          animation: busy ? "trove-orb-glow 2.4s ease-in-out infinite" : undefined,
        }}
      />

      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        className="relative z-[1]"
        style={{
          filter:
            "drop-shadow(0 0 6px rgba(59,130,246,0.45)) drop-shadow(0 2px 8px rgba(0,0,0,0.45))",
        }}
      >
        {/* Black app tile */}
        <rect x="4" y="4" width="40" height="40" rx="11" fill={face} />
        {/* Subtle top sheen */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="11"
          fill="url(#trove-tile-sheen)"
          opacity="0.35"
        />
        <defs>
          <linearGradient id="trove-tile-sheen" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {/* Thin blue rim */}
        <rect
          x="4.5"
          y="4.5"
          width="39"
          height="39"
          rx="10.5"
          fill="none"
          stroke={state === "error" ? "#f87171" : state === "done" ? "#4ade80" : "#3b82f6"}
          strokeOpacity={state === "idle" ? 0.55 : 0.85}
          strokeWidth="1.25"
        />
        {/* White geometric T */}
        <path
          d="M15.5 16.2h17c0.75 0 1.35 0.6 1.35 1.35v1.35c0 0.75-0.6 1.35-1.35 1.35H26.6v12.4c0 0.75-0.6 1.35-1.35 1.35h-2.5c-0.75 0-1.35-0.6-1.35-1.35V20.25H15.5c-0.75 0-1.35-0.6-1.35-1.35v-1.35c0-0.75 0.6-1.35 1.35-1.35z"
          fill="#f8fafc"
        />
      </svg>
    </span>
  );
}
