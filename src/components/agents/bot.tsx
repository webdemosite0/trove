"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type BotState = "idle" | "working" | "done" | "failed";

/** Visual species for each Tro — 10 mascots, ChatGPT-dots energy, Trove identity. */
export type SplashySpecies =
  | "muse"
  | "pulse"
  | "orb"
  | "spark"
  | "nova"
  | "drift"
  | "lead"
  | "guide"
  | "bloom"
  | "byte";

export const SPECIES: SplashySpecies[] = [
  "muse",
  "pulse",
  "orb",
  "spark",
  "nova",
  "drift",
  "lead",
  "guide",
  "bloom",
  "byte",
];

export const SPECIES_META: Record<
  SplashySpecies,
  { label: string; vibe: string; defaultAccent: string; image?: string }
> = {
  // Transparent mascot artwork, cut out from the OneCrew crew portraits and
  // embedded as base64 in src/lib/mascot-images.ts (binary uploads corrupt via
  // the file APIs here), served from /api/mascots/<name>.
  // Every species has artwork; the animated blob below remains as a safety net.
  muse: { label: "Muse", vibe: "Creative spark", defaultAccent: "#a78bfa", image: "/api/mascots/echo" },
  pulse: { label: "Pulse", vibe: "Fast & curious", defaultAccent: "#38bdf8", image: "/api/mascots/leo" },
  orb: { label: "Orb", vibe: "Calm focus", defaultAccent: "#34d399", image: "/api/mascots/scout" },
  spark: { label: "Spark", vibe: "Playful energy", defaultAccent: "#f472b6", image: "/api/mascots/milo" },
  nova: { label: "Nova", vibe: "Bright ideas", defaultAccent: "#fbbf24", image: "/api/mascots/atlas" },
  drift: { label: "Drift", vibe: "Soft explorer", defaultAccent: "#fb923c", image: "/api/mascots/zara" },
  lead: { label: "Lead", vibe: "Steady captain", defaultAccent: "#6366f1", image: "/api/mascots/nova" },
  guide: { label: "Guide", vibe: "Warm coach", defaultAccent: "#2dd4bf", image: "/api/mascots/iris" },
  bloom: { label: "Bloom", vibe: "Design eye", defaultAccent: "#e879f9", image: "/api/mascots/luna" },
  byte: { label: "Byte", vibe: "Code craftsman", defaultAccent: "#64748b", image: "/api/mascots/kael" },
};

type RetiredSpecies = "quill" | "aegis";

/**
 * Real working footage per species — shown while the Tro is working.
 * Served from /tros/*.mp4 (public/). If a file is missing, the Bot falls
 * back to the animated mascot automatically.
 */
export const WORKING_VIDEO: Partial<Record<SplashySpecies, string>> = {
  spark: "/tros/milo-working.mp4",
  nova: "/tros/atlas-working.mp4",
  guide: "/tros/iris-working.mp4",
};

export function speciesFromSeed(seed?: string | null): SplashySpecies {
  const s = String(seed || "trove");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // Quill and Aegis were retired: hash over the original 12 so every existing
  // Tro keeps its mascot, remapping only the two retired species.
  const legacy = [...SPECIES, "quill", "aegis"] as (SplashySpecies | RetiredSpecies)[];
  const pick = legacy[h % legacy.length]!;
  if (pick === "quill") return "muse";
  if (pick === "aegis") return "orb";
  return pick;
}

/**
 * Premium animated Tro mascot — soft blob silhouette, unique species, live motion.
 */
export function Bot({
  size = 56,
  accent = "#3b82f6",
  state = "idle",
  species,
  seed,
  className,
  showLabel = false,
}: {
  size?: number;
  accent?: string;
  state?: BotState;
  species?: SplashySpecies;
  seed?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const ink = `color-mix(in oklab, ${accent}, #000 28%)`;
  const soft = `color-mix(in oklab, ${accent} 40%, transparent)`;
  const uid = useId().replace(/:/g, "");
  const kind = species || speciesFromSeed(seed);
  const meta = SPECIES_META[kind];
  const working = state === "working";
  const done = state === "done";
  const failed = state === "failed";
  // Working footage for this species (falls back to the animated mascot
  // if the video file isn't available).
  const [videoFailed, setVideoFailed] = useState(false);
  const workingVideo = working && !videoFailed ? WORKING_VIDEO[kind] : undefined;
  // A different species gets a fresh attempt at its own footage.
  useEffect(() => {
    setVideoFailed(false);
  }, [kind]);
  // Deterministic per-instance phase so a grid of mascots doesn't pulse in sync.
  const phase = ((size * 13 + kind.length * 7) % 10) * 0.42;

  const sparkles = [
    { left: "84%", top: "4%", s: 0.9, delay: 0 },
    { left: "2%", top: "54%", s: 0.62, delay: 1.7 },
    { left: "66%", top: "90%", s: 0.74, delay: 3.2 },
  ];

  const face = useMemo(() => {
    if (failed) return { eye: "x" as const, mouth: "flat" as const };
    if (done) return { eye: "happy" as const, mouth: "smile" as const };
    if (working) return { eye: "focus" as const, mouth: "dot" as const };
    return { eye: "round" as const, mouth: "soft" as const };
  }, [done, failed, working]);

  return (
    <span
      className={cn("relative inline-flex shrink-0 flex-col items-center tro-motion", className)}
      style={{ width: size }}
      aria-hidden
      data-species={kind}
      data-state={state}
    >
      <span className="relative" style={{ width: size, height: size }}>
        {/* Ambient glow */}
        <span
          className={cn(
            "pointer-events-none absolute inset-[-18%] rounded-full blur-2xl transition-opacity duration-500",
            working ? "opacity-80" : "opacity-40",
          )}
          style={{
            background: `radial-gradient(circle, ${soft}, transparent 70%)`,
            animation: working ? "tro-glow 1.6s ease-in-out infinite" : "tro-breathe 4s ease-in-out infinite",
          }}
        />

        {workingVideo ? (
          /* Real working footage — circular crop hides the 16:9 frame. */
          <video
            src={workingVideo}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
            className="relative z-[1] select-none rounded-full object-cover ring-1 ring-white/25"
            style={{
              width: size,
              height: size,
              filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.28))",
            }}
          />
        ) : meta.image ? (
          <>
            <img
              src={meta.image}
              alt=""
              width={size}
              height={size}
              draggable={false}
              className="relative z-[1] select-none"
              style={{
                width: size,
                height: size,
                // Transparent PNG — no clip needed; soft shadow grounds the mascot.
                filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.28))",
                animation: working
                  ? "tro-work 0.9s ease-in-out infinite"
                  : "tro-float 5s ease-in-out infinite",
                animationDelay: `${(size % 9) * 0.08}s`,
              }}
            />
            {/* Muse-style light sweep — diagonal highlight masked to the
                mascot silhouette so the shine only plays across the blob. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.55) 50%, transparent 62%)",
                backgroundSize: "280% 100%",
                WebkitMaskImage: `url(${meta.image})`,
                maskImage: `url(${meta.image})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                animation: working
                  ? "tro-shimmer 1.9s linear infinite"
                  : "tro-shimmer 5.2s linear infinite",
                animationDelay: `${phase}s`,
              }}
            />
            {/* Sparkle glints — tiny 4-point stars that pop in and out,
                staggered around the mascot like Muse's sparkles. */}
            {sparkles.map((sp, i) => (
              <svg
                key={i}
                aria-hidden
                viewBox="0 0 24 24"
                className="pointer-events-none absolute z-[3]"
                style={{
                  left: sp.left,
                  top: sp.top,
                  width: Math.max(10, size * 0.22 * sp.s),
                  height: Math.max(10, size * 0.22 * sp.s),
                  filter: "drop-shadow(0 0 5px rgba(255,255,255,0.9))",
                  animation: working
                    ? "tro-sparkle 2.2s ease-in-out infinite"
                    : "tro-sparkle 4.8s ease-in-out infinite",
                  animationDelay: `${phase + sp.delay}s`,
                }}
              >
                <path
                  d="M12 1 C13.2 7.5 15.5 10.6 22 12 C15.5 13.4 13.2 16.5 12 23 C10.8 16.5 8.5 13.4 2 12 C8.5 10.6 10.8 7.5 12 1 Z"
                  fill="#fff"
                  opacity="0.95"
                />
              </svg>
            ))}
          </>
        ) : (
          <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            className="relative z-[1] drop-shadow-sm"
            style={{
              animation: working
                ? "tro-work 0.9s ease-in-out infinite"
                : "tro-float 5s ease-in-out infinite",
              animationDelay: `${(size % 9) * 0.08}s`,
            }}
          >
            <defs>
              <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="1" />
                <stop offset="100%" stopColor={ink} stopOpacity="0.92" />
              </linearGradient>
              <radialGradient id={`shine-${uid}`} cx="35%" cy="30%" r="55%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <filter id={`soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
              </filter>
            </defs>

            {/* Body by species */}
            {kind === "muse" && (
              <>
                <ellipse cx="32" cy="38" rx="18" ry="15" fill={`url(#g-${uid})`} />
                <circle cx="32" cy="26" r="14" fill={`url(#g-${uid})`} />
                <path d="M20 17 L15 7 L25 15 Z" fill={ink} opacity="0.9" />
                <path d="M44 17 L49 7 L39 15 Z" fill={ink} opacity="0.9" />
              </>
            )}
            {kind === "pulse" && (
              <>
                <ellipse cx="32" cy="34" rx="17" ry="19" fill={`url(#g-${uid})`} />
                <circle cx="32" cy="14" r="4.5" fill={ink}>
                  {working ? <animate attributeName="r" values="4;6;4" dur="0.7s" repeatCount="indefinite" /> : null}
                </circle>
                <line x1="32" y1="18" x2="32" y2="14" stroke={ink} strokeWidth="2" />
              </>
            )}
            {kind === "orb" && (
              <>
                <circle cx="32" cy="34" r="20" fill={`url(#g-${uid})`} />
                {working ? (
                  <circle cx="32" cy="34" r="22" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.55" strokeDasharray="6 8">
                    <animateTransform attributeName="transform" type="rotate" from="0 32 34" to="360 32 34" dur="2.8s" repeatCount="indefinite" />
                  </circle>
                ) : null}
              </>
            )}
            {kind === "spark" && (
              <path
                d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
                fill={`url(#g-${uid})`}
              >
                {working ? (
                  <animateTransform attributeName="transform" type="rotate" values="-6 32 32;6 32 32;-6 32 32" dur="0.55s" repeatCount="indefinite" />
                ) : null}
              </path>
            )}
            {kind === "nova" && (
              <>
                <path d="M32 12 C44 12 52 24 48 36 C44 48 36 52 32 52 C28 52 20 48 16 36 C12 24 20 12 32 12Z" fill={`url(#g-${uid})`} />
                <ellipse cx="32" cy="26" rx="10" ry="5" fill="white" opacity="0.18" />
              </>
            )}
            {kind === "drift" && (
              <>
                <ellipse cx="32" cy="36" rx="20" ry="14" fill={`url(#g-${uid})`} />
                <circle cx="22" cy="28" r="8" fill={`url(#g-${uid})`} />
                <circle cx="42" cy="28" r="8" fill={`url(#g-${uid})`} />
                <circle cx="32" cy="22" r="9" fill={`url(#g-${uid})`} />
              </>
            )}
            {kind === "lead" && (
              <>
                <ellipse cx="32" cy="36" rx="16" ry="18" fill={`url(#g-${uid})`} />
                <path d="M18 28 Q32 18 46 28 L44 40 Q32 34 20 40 Z" fill={ink} opacity="0.35" />
                <circle cx="32" cy="18" r="5" fill={ink} opacity="0.85" />
              </>
            )}
            {kind === "guide" && (
              <>
                <ellipse cx="32" cy="36" rx="17" ry="16" fill={`url(#g-${uid})`} />
                <circle cx="32" cy="26" r="13" fill={`url(#g-${uid})`} />
                <path d="M24 44 Q32 50 40 44" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.35" />
              </>
            )}
            {kind === "bloom" && (
              <>
                <circle cx="32" cy="34" r="18" fill={`url(#g-${uid})`} />
                <circle cx="46" cy="20" r="5" fill={accent} opacity="0.9" />
                <circle cx="48" cy="18" r="2" fill="white" opacity="0.5" />
              </>
            )}
            {kind === "byte" && (
              <>
                <rect x="14" y="18" width="36" height="32" rx="14" fill={`url(#g-${uid})`} />
                <path d="M22 14 L26 18 M42 14 L38 18" stroke={ink} strokeWidth="2" strokeLinecap="round" />
              </>
            )}

            {/* Shared face plate */}
            <ellipse cx="32" cy="36" rx="11" ry="8" fill="var(--color-canvas)" opacity="0.92" />
            <ellipse cx="32" cy="34" rx="11" ry="9" fill={`url(#shine-${uid})`} />

            {/* Eyes */}
            {face.eye === "focus" ? (
              <>
                <rect x="25" y="33" width="5" height="2.4" rx="1" fill={ink}>
                  <animate attributeName="width" values="5;7;5" dur="0.55s" repeatCount="indefinite" />
                </rect>
                <rect x="34" y="33" width="5" height="2.4" rx="1" fill={ink}>
                  <animate attributeName="width" values="5;7;5" dur="0.55s" begin="0.08s" repeatCount="indefinite" />
                </rect>
              </>
            ) : face.eye === "happy" ? (
              <>
                <path d="M24 34 Q27 31 30 34" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
                <path d="M34 34 Q37 31 40 34" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
              </>
            ) : face.eye === "x" ? (
              <>
                <path d="M24 31 L29 36 M29 31 L24 36" stroke={ink} strokeWidth="1.8" />
                <path d="M35 31 L40 36 M40 31 L35 36" stroke={ink} strokeWidth="1.8" />
              </>
            ) : (
              <>
                <circle cx="27" cy="34" r="2.3" fill={ink}>
                  {!working ? (
                    <animate attributeName="ry" values="2.3;0.25;2.3" dur="3.4s" repeatCount="indefinite" />
                  ) : null}
                </circle>
                <circle cx="37" cy="34" r="2.3" fill={ink}>
                  {!working ? (
                    <animate attributeName="ry" values="2.3;0.25;2.3" dur="3.4s" begin="0.12s" repeatCount="indefinite" />
                  ) : null}
                </circle>
                <circle cx="26.3" cy="33.3" r="0.7" fill="white" opacity="0.85" />
                <circle cx="36.3" cy="33.3" r="0.7" fill="white" opacity="0.85" />
              </>
            )}

            {/* Mouth */}
            {face.mouth === "smile" ? (
              <path d="M28 39 Q32 42.5 36 39" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
            ) : face.mouth === "flat" ? (
              <line x1="28" y1="40" x2="36" y2="40" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
            ) : face.mouth === "dot" ? (
              <circle cx="32" cy="39.5" r="1.5" fill={ink}>
                <animate attributeName="opacity" values="1;0.35;1" dur="0.7s" repeatCount="indefinite" />
              </circle>
            ) : (
              <ellipse cx="32" cy="39.5" rx="3.2" ry="1.5" fill={ink} opacity="0.75" />
            )}

            {/* Working scan */}
            {working ? (
              <rect x="22" y="30" width="20" height="2" rx="1" fill={accent} opacity="0.5">
                <animate attributeName="y" values="30;41;30" dur="1s" repeatCount="indefinite" />
              </rect>
            ) : null}
          </svg>
        )}
      </span>

      {showLabel ? (
        <span className="mt-1.5 text-center">
          <span className="block text-[11px] font-semibold tracking-tight text-ink">{meta.label}</span>
          <span className="block text-[10px] text-ink-4">{meta.vibe}</span>
        </span>
      ) : null}

      <style>{`
        @keyframes tro-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4%) rotate(1.2deg); }
        }
        @keyframes tro-work {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3%) scale(1.04); }
        }
        @keyframes tro-glow {
          0%, 100% { transform: scale(0.92); opacity: 0.45; }
          50% { transform: scale(1.12); opacity: 0.9; }
        }
        @keyframes tro-breathe {
          0%, 100% { transform: scale(0.96); opacity: 0.35; }
          50% { transform: scale(1.05); opacity: 0.55; }
        }
        /* Muse-style light sweep: the bright band crosses the silhouette in
           the first quarter of the cycle, then rests invisible. */
        @keyframes tro-shimmer {
          0% { background-position: 130% 0; opacity: 0; }
          5% { opacity: 1; }
          24% { background-position: -30% 0; opacity: 1; }
          32%, 100% { background-position: -30% 0; opacity: 0; }
        }
        /* Sparkle glint: pops in, twinkles, fades — staggered per sparkle. */
        @keyframes tro-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.25) rotate(0deg); }
          12% { opacity: 1; transform: scale(1) rotate(20deg); }
          28% { opacity: 0; transform: scale(0.55) rotate(55deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tro-motion, .tro-motion * { animation: none !important; }
        }
      `}</style>
    </span>
  );
}

/** Decorative orbit dots used around team bots while a run is active. */
export function OrbitRing({
  size = 96,
  accent = "#3b82f6",
}: {
  size?: number;
  accent?: string;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: size,
        height: size,
        animation: "nx-orbit 6s linear infinite",
      }}
    >
      {[0, 120, 240].map((deg) => (
        <span
          key={deg}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            background: `color-mix(in oklab, ${accent}, #000 var(--tint-darken, 0%))`,
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateX(${size / 2}px)`,
            transformOrigin: "0 0",
            opacity: 0.55,
          }}
        />
      ))}
    </span>
  );
}
