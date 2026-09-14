/**
 * Photo-style scene decorations for the home / chat empty state:
 * glass cube (left), abstract orb (right), handwritten annotations.
 * Pure CSS / SVG — no image assets required.
 */
export function SceneDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Left glass cube */}
      <div className="absolute left-[-2%] top-[22%] hidden w-[200px] sm:block lg:left-[4%] lg:w-[240px] xl:left-[8%]">
        <GlassCube />
        <p
          className="absolute -right-2 top-[-28px] max-w-[140px] text-right text-[13px] font-medium leading-snug text-indigo-500/80"
          style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
        >
          From ideas
          <br />
          to real outcomes.
          <span className="mt-0.5 block text-[18px] leading-none text-indigo-400">↗</span>
        </p>
      </div>

      {/* Right abstract orb */}
      <div className="absolute right-[-4%] top-[8%] hidden w-[220px] sm:block lg:right-[2%] lg:w-[260px] xl:right-[6%]">
        <GlassOrb />
        <p
          className="absolute -left-4 top-[18%] max-w-[150px] text-[13px] font-medium leading-snug text-indigo-500/80"
          style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
        >
          Your AI workspace
          <br />
          for what&apos;s next.
          <span className="mt-0.5 block text-[18px] leading-none text-indigo-400">↘</span>
        </p>
      </div>

      {/* Right vertical labels */}
      <div
        className="absolute right-3 top-[42%] hidden flex-col gap-1 text-[11px] font-medium tracking-wide text-indigo-400/70 xl:flex"
        style={{ writingMode: "vertical-rl", fontFamily: "ui-rounded, 'Segoe Print', cursive" }}
      >
        <span>Think</span>
        <span>Build</span>
        <span>Automate</span>
        <span>Grow</span>
      </div>

      {/* Bottom-right note */}
      <p
        className="absolute bottom-8 right-8 hidden text-[13px] font-medium text-indigo-400/70 sm:block"
        style={{ fontFamily: "ui-rounded, 'Segoe Print', 'Comic Sans MS', cursive" }}
      >
        A more
        <br />
        productive you. ↗
      </p>
    </div>
  );
}

function GlassCube() {
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full drop-shadow-2xl" fill="none">
      <defs>
        <linearGradient id="cubeFaceA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="cubeFaceB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="cubeFaceC" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.6" />
        </linearGradient>
        <filter id="cubeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#cubeGlow)" transform="translate(20,30)">
        <path d="M80 10 L150 45 L80 80 L10 45 Z" fill="url(#cubeFaceC)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <path d="M10 45 L80 80 L80 150 L10 115 Z" fill="url(#cubeFaceB)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <path d="M80 80 L150 45 L150 115 L80 150 Z" fill="url(#cubeFaceA)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <path d="M45 62 L45 128 M115 62 L115 128" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <path d="M45 95 L115 95" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </g>
      <ellipse cx="100" cy="178" rx="55" ry="8" fill="rgba(99,102,241,0.12)" />
    </svg>
  );
}

function GlassOrb() {
  return (
    <svg viewBox="0 0 220 220" className="h-auto w-full drop-shadow-2xl" fill="none">
      <defs>
        <linearGradient id="orbRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="orbCore" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15" />
        </radialGradient>
        <filter id="orbBlur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <ellipse
        cx="110"
        cy="110"
        rx="78"
        ry="48"
        fill="none"
        stroke="url(#orbRing)"
        strokeWidth="10"
        opacity="0.85"
        transform="rotate(-25 110 110)"
      />
      <ellipse
        cx="110"
        cy="110"
        rx="70"
        ry="42"
        fill="none"
        stroke="url(#orbRing)"
        strokeWidth="6"
        opacity="0.55"
        transform="rotate(15 110 110)"
      />
      <ellipse
        cx="110"
        cy="110"
        rx="62"
        ry="36"
        fill="none"
        stroke="rgba(199,210,254,0.6)"
        strokeWidth="4"
        transform="rotate(-50 110 110)"
      />
      <circle cx="110" cy="110" r="28" fill="url(#orbCore)" />
      <circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.7)" filter="url(#orbBlur)" />
    </svg>
  );
}
