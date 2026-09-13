"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import "./orb.css";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * Trove mark — geometric monogram.
 *
 * Concept: a vaulted frame (the "trove") holding a precise T, with a thin
 * orbital arc for continuous creation. Readable at 16px, premium at 48px+.
 *
 * States only change motion and accent; the silhouette never changes.
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
  const uid = useId().replace(/:/g, "");
  const g = {
    face: `tv-face-${uid}`,
    edge: `tv-edge-${uid}`,
    t: `tv-t-${uid}`,
    arc: `tv-arc-${uid}`,
  };

  const orbit =
    state === "working" ? "4.5s" : state === "thinking" ? "10s" : undefined;
  const pulse = state === "idle" || state === "thinking";
  const accent =
    state === "error" ? "#ef4444" : state === "done" ? "#22c55e" : undefined;

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
      {(state === "thinking" || state === "working") && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-14%] rounded-[22%] opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 68%)",
            filter: "blur(4px)",
            animation: "trove-orb-glow 2.4s ease-in-out infinite",
          }}
        />
      )}

      <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className="relative z-[1]">
        <defs>
          <linearGradient id={g.face} x1="0.15" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#2a2f45" />
            <stop offset="55%" stopColor="#151826" />
            <stop offset="100%" stopColor="#0a0c14" />
          </linearGradient>
          <linearGradient id={g.edge} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#6366f1" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={g.t} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
          <linearGradient id={g.arc} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
            <stop offset="35%" stopColor="#818cf8" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect
          x="5"
          y="5"
          width="38"
          height="38"
          rx="11"
          fill={accent ?? `url(#${g.face})`}
          opacity={accent ? 0.92 : 1}
        />
        <rect
          x="5"
          y="5"
          width="38"
          height="38"
          rx="11"
          fill="none"
          stroke={accent ?? `url(#${g.edge})`}
          strokeWidth="1.35"
          opacity={accent ? 0.85 : 1}
        />

        {!accent ? (
          <rect
            x="8"
            y="8"
            width="32"
            height="32"
            rx="9"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        ) : null}

        <path
          d="M16.2 16.4h15.6c0.7 0 1.2 0.55 1.2 1.2v1.15c0 0.66-0.53 1.2-1.2 1.2H26.1v11.4c0 0.72-0.58 1.3-1.3 1.3h-1.6c-0.72 0-1.3-0.58-1.3-1.3V19.95H16.2c-0.66 0-1.2-0.54-1.2-1.2V17.6c0-0.65 0.54-1.2 1.2-1.2z"
          fill={accent ? "#ffffff" : `url(#${g.t})`}
        />

        <g
          style={{
            transformOrigin: "24px 24px",
            animation: orbit ? `nx-orbit ${orbit} linear infinite` : undefined,
          }}
        >
          <path
            d="M8.5 24 A15.5 15.5 0 0 1 39.5 24"
            stroke={accent ?? `url(#${g.arc})`}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity={state === "idle" ? 0.55 : 0.95}
          />
          {state !== "error" && state !== "done" ? (
            <circle cx="39.5" cy="24" r="1.5" fill={accent ?? "#a5b4fc"} opacity="0.95">
              {(state === "thinking" || state === "working") && (
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
              )}
            </circle>
          ) : null}
        </g>
      </svg>
    </span>
  );
}
