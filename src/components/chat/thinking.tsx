"use client";

/* ─────────────────────────────────────────────────────────
 * THINKING — the one Trove thinking indicator, used everywhere.
 *
 * A unique "thinking ball": a small orb with a slowly rotating
 * conic gradient (violet → blue → pink, Trove identity), a soft
 * breathing scale, and an orbiting highlight. Just the word
 * "Thinking" beside it — no traces, no timers, no variants.
 * ───────────────────────────────────────────────────────── */

export function ThinkingBall({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="trove-thinking-ball relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Rotating gradient core */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #8b5cf6, #3b82f6, #ec4899, #8b5cf6)",
          animation: "trove-think-spin 2.4s linear infinite",
          filter: "blur(0.5px)",
        }}
      />
      {/* Inner glow that breathes */}
      <span
        className="absolute inset-[3px] rounded-full bg-white/90 dark:bg-black/40"
        style={{ animation: "trove-think-breathe 1.8s ease-in-out infinite" }}
      />
      {/* Orbiting highlight dot */}
      <span
        className="absolute inset-0"
        style={{ animation: "trove-think-spin 1.6s linear infinite reverse" }}
      >
        <span
          className="absolute left-1/2 top-0 size-[4px] -translate-x-1/2 -translate-y-[1px] rounded-full bg-white shadow-[0_0_6px_2px_rgba(139,92,246,0.7)]"
        />
      </span>
      <style>{`
        @keyframes trove-think-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes trove-think-breathe {
          0%, 100% { transform: scale(0.82); opacity: 0.7; }
          50% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .trove-thinking-ball span { animation: none !important; }
        }
      `}</style>
    </span>
  );
}

export function Thinking({
  label = "Thinking",
  size = 20,
  className = "",
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div role="status" className={`flex w-fit items-center gap-2.5 py-1 ${className}`}>
      <ThinkingBall size={size} />
      <span
        className="text-[13px] font-medium text-ink-3"
        style={{ animation: "trove-think-pulse 2s ease-in-out infinite" }}
      >
        {label}
        <style>{`
          @keyframes trove-think-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
        `}</style>
      </span>
    </div>
  );
}

export default Thinking;
