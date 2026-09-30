"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

export type BotState = "idle" | "working" | "done" | "failed";

/** Visual species for each Tro — deterministic from a seed (id or name). */
export type SplashySpecies =
  | "muse"
  | "pulse"
  | "orb"
  | "spark"
  | "nova"
  | "drift";

const SPECIES: SplashySpecies[] = ["muse", "pulse", "orb", "spark", "nova", "drift"];

export function speciesFromSeed(seed?: string | null): SplashySpecies {
  const s = String(seed || "trove");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SPECIES[h % SPECIES.length]!;
}

/**
 * Animated splashy mascot for Tros.
 * Each species has a distinct silhouette; working state adds motion.
 */
export function Bot({
  size = 56,
  accent = "#3b82f6",
  state = "idle",
  species,
  seed,
  className,
}: {
  size?: number;
  accent?: string;
  state?: BotState;
  species?: SplashySpecies;
  /** Used to pick a stable species when `species` is omitted. */
  seed?: string;
  className?: string;
}) {
  const ink = `color-mix(in oklab, ${accent}, #000 var(--tint-darken, 0%))`;
  const soft = `color-mix(in oklab, ${accent} 35%, transparent)`;
  const uid = useId().replace(/:/g, "");
  const kind = species || speciesFromSeed(seed);
  const working = state === "working";
  const done = state === "done";
  const failed = state === "failed";

  const face = useMemo(() => {
    if (failed) return { eye: "M" as const, mouth: "flat" as const };
    if (done) return { eye: "happy" as const, mouth: "smile" as const };
    if (working) return { eye: "focus" as const, mouth: "dot" as const };
    return { eye: "round" as const, mouth: "soft" as const };
  }, [done, failed, working]);

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
      data-species={kind}
      data-state={state}
    >
      {/* ambient glow */}
      <span
        className={cn(
          "pointer-events-none absolute inset-[-12%] rounded-full opacity-0 blur-xl transition-opacity duration-500",
          working && "opacity-70",
        )}
        style={{
          background: `radial-gradient(circle, ${soft}, transparent 70%)`,
          animation: working ? "tro-glow 1.8s ease-in-out infinite" : undefined,
        }}
      />

      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn(!working && "nx-bob")}
        style={!working ? { animationDelay: `${(size % 7) * 0.15}s` } : undefined}
      >
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={ink} stopOpacity="0.85" />
          </linearGradient>
          <clipPath id={`c-${uid}`}>
            <circle cx="32" cy="34" r="18" />
          </clipPath>
        </defs>

        {/* species body */}
        {kind === "muse" ? (
          <>
            <ellipse cx="32" cy="38" rx="18" ry="16" fill={`url(#g-${uid})`} opacity="0.92" />
            <circle cx="32" cy="26" r="14" fill={`url(#g-${uid})`} />
            {/* ear tufts */}
            <path d="M20 18 L16 8 L24 16 Z" fill={ink} opacity="0.9" />
            <path d="M44 18 L48 8 L40 16 Z" fill={ink} opacity="0.9" />
          </>
        ) : null}

        {kind === "pulse" ? (
          <>
            <rect x="14" y="18" width="36" height="32" rx="14" fill={`url(#g-${uid})`} />
            <circle cx="32" cy="14" r="5" fill={ink}>
              {working ? (
                <animate attributeName="r" values="4;6;4" dur="0.9s" repeatCount="indefinite" />
              ) : null}
            </circle>
            <line x1="32" y1="19" x2="32" y2="14" stroke={ink} strokeWidth="2" />
          </>
        ) : null}

        {kind === "orb" ? (
          <>
            <circle cx="32" cy="34" r="20" fill={`url(#g-${uid})`} />
            <circle cx="32" cy="34" r="14" fill="var(--color-raised)" opacity="0.25" />
            {working ? (
              <circle
                cx="32"
                cy="34"
                r="22"
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                opacity="0.5"
                strokeDasharray="8 6"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 32 34"
                  to="360 32 34"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>
            ) : null}
          </>
        ) : null}

        {kind === "spark" ? (
          <>
            <path
              d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
              fill={`url(#g-${uid})`}
            >
              {working ? (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-4 32 32;4 32 32;-4 32 32"
                  dur="0.7s"
                  repeatCount="indefinite"
                />
              ) : null}
            </path>
          </>
        ) : null}

        {kind === "nova" ? (
          <>
            <path
              d="M32 12 C42 12 50 22 48 34 C46 46 36 52 32 52 C28 52 18 46 16 34 C14 22 22 12 32 12Z"
              fill={`url(#g-${uid})`}
            />
            <ellipse cx="32" cy="28" rx="10" ry="6" fill="white" opacity="0.2" />
          </>
        ) : null}

        {kind === "drift" ? (
          <>
            <ellipse cx="32" cy="36" rx="20" ry="14" fill={`url(#g-${uid})`} />
            <circle cx="22" cy="28" r="8" fill={`url(#g-${uid})`} />
            <circle cx="42" cy="28" r="8" fill={`url(#g-${uid})`} />
            <circle cx="32" cy="22" r="9" fill={`url(#g-${uid})`} />
          </>
        ) : null}

        {/* visor / face plate */}
        <g clipPath={kind === "orb" ? `url(#c-${uid})` : undefined}>
          <rect
            x="20"
            y="28"
            width="24"
            height="14"
            rx="7"
            fill="var(--color-canvas)"
            opacity="0.92"
          />
          {/* eyes */}
          {face.eye === "focus" ? (
            <>
              <rect x="25" y="32" width="5" height="2.5" rx="1" fill={ink}>
                <animate attributeName="width" values="5;7;5" dur="0.6s" repeatCount="indefinite" />
              </rect>
              <rect x="34" y="32" width="5" height="2.5" rx="1" fill={ink}>
                <animate attributeName="width" values="5;7;5" dur="0.6s" begin="0.1s" repeatCount="indefinite" />
              </rect>
            </>
          ) : face.eye === "happy" ? (
            <>
              <path d="M24 34 Q27 31 30 34" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
              <path d="M34 34 Q37 31 40 34" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            </>
          ) : face.eye === "M" ? (
            <>
              <path d="M24 31 L27 34 L24 37" fill="none" stroke={ink} strokeWidth="2" />
              <path d="M40 31 L37 34 L40 37" fill="none" stroke={ink} strokeWidth="2" />
            </>
          ) : (
            <>
              <circle cx="27" cy="34" r="2.2" fill={ink}>
                {!working ? (
                  <animate attributeName="ry" values="2.2;0.3;2.2" dur="3.2s" repeatCount="indefinite" />
                ) : null}
              </circle>
              <circle cx="37" cy="34" r="2.2" fill={ink}>
                {!working ? (
                  <animate attributeName="ry" values="2.2;0.3;2.2" dur="3.2s" begin="0.15s" repeatCount="indefinite" />
                ) : null}
              </circle>
            </>
          )}

          {/* mouth */}
          {face.mouth === "smile" ? (
            <path d="M28 39 Q32 42 36 39" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          ) : face.mouth === "flat" ? (
            <line x1="28" y1="40" x2="36" y2="40" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          ) : face.mouth === "dot" ? (
            <circle cx="32" cy="39.5" r="1.4" fill={ink}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
          ) : (
            <ellipse cx="32" cy="39.5" rx="3" ry="1.4" fill={ink} opacity="0.7" />
          )}
        </g>

        {/* working scan line */}
        {working ? (
          <rect x="22" y="30" width="20" height="2" rx="1" fill={accent} opacity="0.55">
            <animate attributeName="y" values="30;40;30" dur="1.1s" repeatCount="indefinite" />
          </rect>
        ) : null}
      </svg>

      <style>{`
        @keyframes tro-glow {
          0%, 100% { transform: scale(0.92); opacity: 0.45; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </span>
  );
}
