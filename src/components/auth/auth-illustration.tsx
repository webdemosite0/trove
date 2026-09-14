/**
 * Right-side illustration for auth screens — matches product photo energy:
 * soft lavender grid, floating robot mascot, cube, handwritten notes.
 */
export function AuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Soft photo-style wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #f4f2ff 0%, #eef4ff 45%, #f8f7ff 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 85% 15%, rgba(167,139,250,0.28), transparent 55%)," +
            "radial-gradient(ellipse 40% 35% at 15% 80%, rgba(129,140,248,0.18), transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(99,102,241,0.07) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(99,102,241,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 20%, transparent 75%)",
        }}
      />

      {/* Annotations */}
      <p
        className="absolute left-[12%] top-[14%] max-w-[140px] text-[13px] font-medium leading-snug text-indigo-500/85"
        style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
      >
        From ideas
        <br />
        to real outcomes.
        <span className="mt-0.5 block text-indigo-400">↘</span>
      </p>
      <p
        className="absolute right-[14%] top-[12%] max-w-[140px] text-right text-[13px] font-medium leading-snug text-indigo-500/85"
        style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
      >
        Your AI workspace
        <br />
        for what's next.
        <span className="mt-0.5 block text-indigo-400">↙</span>
      </p>
      <p
        className="absolute bottom-[18%] right-[12%] text-[13px] font-medium leading-snug text-indigo-500/80"
        style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
      >
        Think
        <br />
        Build
        <br />
        Automate
        <br />
        Grow
        <span className="mt-1 block text-indigo-400">↗</span>
      </p>
      <p
        className="absolute bottom-[10%] right-[18%] text-[13px] font-medium text-indigo-500/75"
        style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
      >
        A more
        <br />
        productive you.
        <span className="ml-1 text-indigo-400">↙</span>
      </p>

      {/* Scene art */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[420px] w-[420px]">
          {/* Glass cube bottom-left */}
          <div className="absolute bottom-6 left-2 w-[140px]">
            <CubeSvg />
          </div>
          {/* Floating idea card */}
          <div className="absolute left-8 top-16 flex size-16 items-center justify-center rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-md">
            <span className="text-2xl">💡</span>
          </div>
          {/* Doc card */}
          <div className="absolute right-6 top-24 flex size-16 items-center justify-center rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-md">
            <span className="text-xl text-indigo-400">☰</span>
          </div>
          {/* Cursor chip */}
          <div className="absolute bottom-28 right-16 rotate-12 text-2xl text-violet-500">➤</div>
          {/* Robot */}
          <div className="absolute left-1/2 top-1/2 w-[200px] -translate-x-1/2 -translate-y-[42%]">
            <RobotSvg />
          </div>
          {/* Stars */}
          <span className="absolute left-[28%] top-[28%] text-lg text-violet-400">✦</span>
          <span className="absolute right-[22%] top-[32%] text-lg text-indigo-400">✦</span>
          {/* Orb rings top-right */}
          <div className="absolute -right-4 -top-2 w-[160px] opacity-90">
            <OrbSvg />
          </div>
        </div>
      </div>
    </div>
  );
}

function RobotSvg() {
  return (
    <svg viewBox="0 0 200 220" className="h-auto w-full drop-shadow-xl" fill="none">
      <defs>
        <linearGradient id="botBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
        <linearGradient id="botFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="botGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* trail */}
      <path
        d="M40 150 C20 130, 30 100, 55 95"
        stroke="url(#botGlow)"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* body */}
      <ellipse cx="100" cy="150" rx="48" ry="52" fill="url(#botBody)" />
      {/* head */}
      <ellipse cx="100" cy="88" rx="52" ry="48" fill="url(#botBody)" />
      {/* antenna */}
      <circle cx="100" cy="38" r="5" fill="#818cf8" />
      <rect x="98" y="42" width="4" height="12" rx="2" fill="#a5b4fc" />
      {/* visor */}
      <ellipse cx="100" cy="90" rx="38" ry="28" fill="url(#botFace)" />
      {/* smile eyes */}
      <path d="M78 88 Q88 98 98 88" stroke="#a5b4fc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M102 88 Q112 98 122 88" stroke="#a5b4fc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* ears */}
      <ellipse cx="48" cy="90" rx="12" ry="16" fill="#818cf8" opacity="0.85" />
      <ellipse cx="152" cy="90" rx="12" ry="16" fill="#818cf8" opacity="0.85" />
      {/* T badge */}
      <circle cx="100" cy="148" r="14" fill="#4f46e5" />
      <text x="100" y="153" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="system-ui">
        T
      </text>
      {/* arms */}
      <path d="M55 140 Q30 120 40 100" stroke="#c4b5fd" strokeWidth="12" strokeLinecap="round" />
      <path d="M145 140 Q175 115 165 95" stroke="#c4b5fd" strokeWidth="12" strokeLinecap="round" />
      <circle cx="40" cy="100" r="9" fill="#312e81" />
      <circle cx="165" cy="95" r="9" fill="#312e81" />
    </svg>
  );
}

function CubeSvg() {
  return (
    <svg viewBox="0 0 160 160" className="h-auto w-full" fill="none">
      <defs>
        <linearGradient id="cA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="cB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="cC" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <g transform="translate(20,20)">
        <path d="M60 8 L110 32 L60 56 L10 32 Z" fill="url(#cC)" stroke="rgba(255,255,255,0.5)" />
        <path d="M10 32 L60 56 L60 110 L10 86 Z" fill="url(#cB)" stroke="rgba(255,255,255,0.35)" />
        <path d="M60 56 L110 32 L110 86 L60 110 Z" fill="url(#cA)" stroke="rgba(255,255,255,0.4)" />
      </g>
    </svg>
  );
}

function OrbSvg() {
  return (
    <svg viewBox="0 0 160 160" className="h-auto w-full" fill="none">
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="80" rx="55" ry="32" stroke="url(#ring)" strokeWidth="8" opacity="0.85" transform="rotate(-30 80 80)" />
      <ellipse cx="80" cy="80" rx="48" ry="28" stroke="url(#ring)" strokeWidth="5" opacity="0.5" transform="rotate(20 80 80)" />
      <circle cx="80" cy="80" r="18" fill="#e0e7ff" opacity="0.9" />
    </svg>
  );
}
