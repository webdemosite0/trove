"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import "./orb.css";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * Trove mark — a lit planet with dual rings.
 *
 * Professional, full mark: dark body, iridescent rim light, primary ring that
 * passes behind/in front of the planet, secondary thin orbit, soft outer glow.
 * States only change motion and accent colour so the logo stays one object.
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
    outer: `tr-outer-${uid}`,
    body: `tr-body-${uid}`,
    rim: `tr-rim-${uid}`,
    gloss: `tr-gloss-${uid}`,
    glow: `tr-glow-${uid}`,
    atm: `tr-atm-${uid}`,
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
        className="pointer-events-none absolute inset-[-18%] rounded-full opacity-70"
        style={{
          background:
            state === "error"
              ? "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)"
              : state === "done"
                ? "radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(124,108,255,0.45) 0%, rgba(56,189,248,0.12) 45%, transparent 70%)",
          filter: "blur(4px)",
          animation:
            state === "thinking" || state === "working"
              ? "trove-orb-glow 2.4s ease-in-out infinite"
              : undefined,
        }}
      />

      <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className="relative z-[1]">
        <defs>
          <linearGradient id={g.ring} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="28%" stopColor="#c084fc" />
            <stop offset="55%" stopColor="#818cf8" />
            <stop offset="78%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <linearGradient id={g.outer} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.75" />
          </linearGradient>
          <radialGradient id={g.body} cx="0.34" cy="0.28" r="0.82">
            <stop offset="0%" stopColor="#3b2a7a" />
            <stop offset="42%" stopColor="#1a1140" />
            <stop offset="100%" stopColor="#06040f" />
          </radialGradient>
          <linearGradient id={g.rim} x1="0.1" y1="0.05" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="40%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id={g.gloss} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={g.glow} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g.atm} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <circle cx="24" cy="24" r="18" fill={`url(#${g.glow})`} opacity={state === "idle" ? 0.45 : 0.75} />

        <g
          style={{
            transformOrigin: "24px 24px",
            animation: orbit ? `nx-orbit ${orbit} linear infinite` : undefined,
          }}
        >
          <g transform="rotate(18 24 24)">
            <ellipse
              cx="24"
              cy="24"
              rx="21.2"
              ry="7.6"
              stroke={tinted ? accent : `url(#${g.outer})`}
              strokeWidth="1"
              opacity={state === "idle" ? 0.45 : 0.7}
              strokeDasharray={state === "thinking" ? "2.5 3.5" : undefined}
            />
            {state !== "error" && state !== "done" ? (
              <circle cx="24" cy="16.4" r="1.35" fill="#e9d5ff" opacity="0.95">
                {state === "working" || state === "thinking" ? (
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
                ) : null}
              </circle>
            ) : null}
          </g>
        </g>

        <g
          style={{
            transformOrigin: "24px 24.5px",
            animation: orbit
              ? `nx-orbit ${state === "working" ? "7s" : orbit} linear infinite`
              : undefined,
          }}
        >
          <g transform="rotate(-24 24 24.5)">
            <path
              d="M5 24.5 A19 7.1 0 0 1 43 24.5"
              stroke={tinted ? accent : `url(#${g.ring})`}
              strokeWidth="1.55"
              strokeLinecap="round"
              opacity={state === "idle" ? 0.55 : 0.8}
            />
            <circle cx="24" cy="24.5" r="11.8" fill={`url(#${g.body})`} />
            <circle
              cx="24"
              cy="24.5"
              r="11.8"
              fill="none"
              stroke={`url(#${g.atm})`}
              strokeWidth="1.8"
              opacity="0.9"
            />
            <circle
              cx="24"
              cy="24.5"
              r="11.8"
              fill="none"
              stroke={tinted ? accent : `url(#${g.rim})`}
              strokeWidth="1.15"
              opacity="0.95"
            />
            <ellipse
              cx="19.8"
              cy="19.6"
              rx="5.2"
              ry="3.8"
              fill={`url(#${g.gloss})`}
              transform="rotate(-32 19.8 19.6)"
            />
            <path
              d="M14.5 27.5 Q24 31 33.5 26"
              stroke="#c4b5fd"
              strokeWidth="0.6"
              opacity="0.25"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M43 24.5 A19 7.1 0 0 1 5 24.5"
              stroke={tinted ? accent : `url(#${g.ring})`}
              strokeWidth="2.55"
              strokeLinecap="round"
            />
          </g>
        </g>

        {state === "done" ? (
          <path
            d="M19.2 24.8l3.1 3.1 6.4-6.6"
            stroke="#fff"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {state === "error" ? (
          <path
            d="M24 18.8v7.2M24 29.6v0.15"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : null}

        {(state === "thinking" || state === "working") && (
          <g opacity="0.9">
            <circle cx="8" cy="14" r="0.9" fill="#f0abfc">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="40" cy="32" r="0.75" fill="#67e8f9">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="38" cy="12" r="0.65" fill="#a5b4fc">
              <animate attributeName="opacity" values="0.15;0.9;0.15" dur="2s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </span>
  );
}
