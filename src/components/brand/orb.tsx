"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import "./orb.css";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * Trove mark — cyan planet with a tilted violet–sky ring.
 * Matches the app icon / favicon. Motion only changes with state.
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
    ring: `tr-ring-${uid}`,
    body: `tr-body-${uid}`,
    gloss: `tr-gloss-${uid}`,
    glow: `tr-glow-${uid}`,
  };

  const orbit =
    state === "working" ? "5.5s" : state === "thinking" ? "12s" : state === "idle" ? "28s" : undefined;
  const pulse = state === "idle" || state === "thinking";
  const tinted = state === "error" || state === "done";
  const accent =
    state === "error" ? "var(--color-critical, #ef4444)" : "var(--color-positive, #22c55e)";

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
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-12%] rounded-full opacity-80"
        style={{
          background:
            state === "error"
              ? "radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 68%)"
              : state === "done"
                ? "radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 68%)"
                : "radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(99,102,241,0.15) 50%, transparent 70%)",
          filter: "blur(3px)",
          animation:
            state === "thinking" || state === "working"
              ? "trove-orb-glow 2.4s ease-in-out infinite"
              : undefined,
        }}
      />

      <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className="relative z-[1]">
        <defs>
          <linearGradient id={g.ring} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="40%" stopColor="#6366f1" />
            <stop offset="75%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id={g.body} cx="0.32" cy="0.28" r="0.88">
            <stop offset="0%" stopColor="#99f6e4" />
            <stop offset="28%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#0ea5e9" />
            <stop offset="82%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <radialGradient id={g.gloss} cx="0.3" cy="0.25" r="0.45">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={g.glow} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="24" cy="24" r="17" fill={`url(#${g.glow})`} opacity={state === "idle" ? 0.5 : 0.8} />

        <g
          style={{
            transformOrigin: "24px 24px",
            animation: orbit ? `nx-orbit ${orbit} linear infinite` : undefined,
          }}
        >
          <g transform="rotate(-28 24 24)">
            <path
              d="M5 24 A19 7 0 0 1 43 24"
              stroke={tinted ? accent : `url(#${g.ring})`}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={state === "idle" ? 0.55 : 0.75}
            />
          </g>
        </g>

        <circle
          cx="24"
          cy="24"
          r="11.6"
          fill={tinted ? accent : `url(#${g.body})`}
          opacity={tinted ? 0.9 : 1}
        />
        {!tinted ? <circle cx="24" cy="24" r="11.6" fill={`url(#${g.gloss})`} /> : null}

        <g
          style={{
            transformOrigin: "24px 24px",
            animation: orbit
              ? `nx-orbit ${state === "working" ? "7s" : orbit} linear infinite`
              : undefined,
          }}
        >
          <g transform="rotate(-28 24 24)">
            <path
              d="M43 24 A19 7 0 0 1 5 24"
              stroke={tinted ? accent : `url(#${g.ring})`}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        </g>

        {state === "done" ? (
          <path
            d="M19.2 24.2l3.1 3.1 6.4-6.6"
            stroke="#fff"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {state === "error" ? (
          <path
            d="M24 18.5v7.2M24 29.3v0.15"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : null}

        {(state === "thinking" || state === "working") && (
          <g opacity="0.9">
            <circle cx="9" cy="13" r="0.85" fill="#a78bfa">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="39" cy="33" r="0.7" fill="#22d3ee">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="2.2s"
                begin="0.4s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}
      </svg>
    </span>
  );
}
