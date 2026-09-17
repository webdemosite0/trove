"use client";

/**
 * Right-side auth illustration — soft lavender studio scene with a polished
 * Trove robot, glass product cards, and gentle motion. CSS/SVG only (no binary
 * assets) so the auth layout stays free of SSR module issues.
 */
export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden bg-[#eef0ff]">
      <style>{`
        @keyframes auth-float-a {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes auth-float-b {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-8px) rotate(-4deg); }
        }
        @keyframes auth-float-c {
          0%, 100% { transform: translateY(0) rotate(5deg); }
          50% { transform: translateY(-12px) rotate(7deg); }
        }
        @keyframes auth-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        @keyframes auth-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.12); }
        }
        .auth-float-a { animation: auth-float-a 6.5s ease-in-out infinite; }
        .auth-float-b { animation: auth-float-b 7.2s ease-in-out infinite; }
        .auth-float-c { animation: auth-float-c 5.8s ease-in-out infinite; }
        .auth-glow { animation: auth-glow 4s ease-in-out infinite; }
        .auth-eye { animation: auth-blink 5.5s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .auth-float-a, .auth-float-b, .auth-float-c, .auth-glow, .auth-eye {
            animation: none !important;
          }
        }
      `}</style>

      <ExactRobotScene />

      {/* Soft edge so the form panel blends cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/50 to-transparent"
      />
    </div>
  );
}

function ExactRobotScene() {
  return (
    <div className="absolute inset-0 select-none" aria-hidden>
      {/* Atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 48% at 52% 38%, rgba(167,139,250,0.38), transparent 68%), radial-gradient(ellipse 40% 35% at 18% 78%, rgba(129,140,248,0.2), transparent 70%), linear-gradient(165deg,#f8f7ff 0%,#eef0ff 45%,#e8ebfa 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right,rgba(99,102,241,0.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(99,102,241,0.08) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 85% 70% at 50% 42%,#000 15%,transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 70% at 50% 42%,#000 15%,transparent 78%)",
        }}
      />

      {/* Ambient orbs */}
      <div className="auth-glow absolute -right-10 top-6 h-56 w-56 rounded-full bg-gradient-to-br from-violet-300/45 to-indigo-400/25 blur-3xl" />
      <div className="absolute -left-8 bottom-16 h-40 w-40 rounded-full bg-indigo-300/25 blur-3xl" />

      {/* Glass cubes — bottom left stack */}
      <div
        className="auth-float-b absolute bottom-[11%] left-[7%]"
        style={{ transform: "rotate(-10deg)" }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="absolute h-9 w-9 rounded-[10px]"
            style={{
              background: `linear-gradient(145deg, hsl(${248 + i * 5}, 72%, ${78 - (i % 3) * 7}%), hsl(${258 + i * 4}, 68%, ${60 - (i % 2) * 6}%))`,
              boxShadow:
                "0 10px 22px rgba(79,70,229,0.22), inset 0 1px 0 rgba(255,255,255,0.55)",
              left: (i % 3) * 26,
              top: Math.floor(i / 3) * 26,
              opacity: 0.92 - (i % 3) * 0.04,
            }}
          />
        ))}
      </div>

      {/* Center robot */}
      <div className="auth-float-a absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[200px] w-[200px]">
          {/* Soft ground shadow */}
          <div className="absolute inset-x-[20%] -bottom-3 h-6 rounded-full bg-indigo-400/20 blur-md" />

          {/* Body */}
          <div
            className="absolute inset-x-[20%] bottom-1 top-[30%] rounded-[42%]"
            style={{
              background: "linear-gradient(180deg,#ffffff 0%,#f0edff 55%,#ddd6fe 100%)",
              boxShadow:
                "0 24px 48px rgba(79,70,229,0.28), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          />

          {/* Head */}
          <div
            className="absolute inset-x-[14%] top-0 h-[56%] rounded-[46%]"
            style={{
              background: "linear-gradient(180deg,#ffffff 0%,#f5f3ff 40%,#e0e7ff 100%)",
              boxShadow:
                "0 16px 36px rgba(67,56,202,0.32), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            {/* Visor */}
            <div
              className="absolute inset-x-[12%] top-[24%] flex h-[40%] items-center justify-center gap-3.5 rounded-full"
              style={{
                background: "linear-gradient(180deg,#1e1b4b 0%,#312e81 100%)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              <span
                className="auth-eye block h-2.5 w-7 rounded-full bg-[#a5b4fc]"
                style={{ boxShadow: "0 0 14px #818cf8, 0 0 4px #c7d2fe" }}
              />
              <span
                className="auth-eye block h-2.5 w-7 rounded-full bg-[#a5b4fc]"
                style={{
                  boxShadow: "0 0 14px #818cf8, 0 0 4px #c7d2fe",
                  animationDelay: "0.08s",
                }}
              />
            </div>

            {/* Ears */}
            <div className="absolute -left-3.5 top-[34%] h-9 w-5 rounded-full bg-gradient-to-r from-[#c4b5fd] to-[#818cf8] shadow-md" />
            <div className="absolute -right-3.5 top-[34%] h-9 w-5 rounded-full bg-gradient-to-l from-[#c4b5fd] to-[#818cf8] shadow-md" />

            {/* Antenna */}
            <div className="absolute left-1/2 top-0 h-3.5 w-1.5 -translate-x-1/2 -translate-y-[95%] rounded-t-full bg-gradient-to-b from-[#a78bfa] to-[#818cf8]">
              <span className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-[#c4b5fd] shadow-[0_0_10px_#a78bfa]" />
            </div>
          </div>

          {/* Arms */}
          <div className="absolute -left-1 top-[50%] h-11 w-11 -rotate-[40deg] rounded-full bg-gradient-to-br from-white to-[#ddd6fe] shadow-lg" />
          <div className="absolute -right-1 top-[50%] h-11 w-11 rotate-[40deg] rounded-full bg-gradient-to-bl from-white to-[#ddd6fe] shadow-lg" />

          {/* Chest badge — black T mark */}
          <div
            className="absolute bottom-[16%] left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-[11px]"
            style={{
              background: "#0a0a0b",
              boxShadow:
                "0 0 0 1.5px rgba(59,130,246,0.55), 0 0 14px rgba(59,130,246,0.35), 0 6px 14px rgba(0,0,0,0.2)",
            }}
          >
            <span className="text-[15px] font-bold leading-none tracking-tight text-white">T</span>
          </div>
        </div>
      </div>

      {/* Floating glass cards */}
      <div className="auth-float-c absolute left-[9%] top-[24%]">
        <div
          className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/70 bg-white/75 p-2 shadow-[0_16px_40px_-12px_rgba(79,70,229,0.35)] backdrop-blur-md"
        >
          <span className="text-2xl leading-none">💡</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-500/80">Idea</span>
        </div>
      </div>

      <div className="auth-float-b absolute right-[10%] top-[30%]">
        <div className="flex h-[88px] w-[76px] flex-col justify-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-[0_16px_40px_-12px_rgba(79,70,229,0.35)] backdrop-blur-md">
          <div className="h-1.5 w-10 rounded-full bg-indigo-300/90" />
          <div className="h-1.5 w-8 rounded-full bg-indigo-200/80" />
          <div className="h-1.5 w-9 rounded-full bg-indigo-100" />
          <div className="mt-1 grid grid-cols-2 gap-1">
            <div className="h-5 rounded-md bg-violet-200/70" />
            <div className="h-5 rounded-md bg-indigo-200/70" />
          </div>
        </div>
      </div>

      <div className="auth-float-a absolute bottom-[28%] right-[14%]">
        <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-2 shadow-[0_12px_28px_-10px_rgba(79,70,229,0.3)] backdrop-blur-md">
          <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-[10px] font-bold text-white">T</span>
          <span className="text-[11px] font-semibold text-zinc-700">Live on *.troveai.site</span>
        </div>
      </div>

      {/* Handwritten-style captions */}
      <p
        className="absolute left-[14%] top-[14%] max-w-[16ch] rotate-[-5deg] text-[13px] font-medium leading-snug text-indigo-800/75"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        From ideas to real outcomes.
      </p>
      <p
        className="absolute right-[8%] top-[16%] max-w-[18ch] rotate-[4deg] text-[13px] font-medium leading-snug text-indigo-800/75"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        Your AI workspace for what's next.
      </p>
      <p
        className="absolute bottom-[18%] left-[12%] text-[13px] font-medium leading-[1.55] text-indigo-900/70"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        Think
        <br />
        Build
        <br />
        Automate
        <br />
        Grow
      </p>
      <p
        className="absolute bottom-[9%] right-[12%] rotate-[-2deg] text-[13px] font-medium text-indigo-800/75"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        A more productive you.
      </p>
    </div>
  );
}
