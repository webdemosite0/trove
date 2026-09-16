"use client";

/**
 * Right-side illustration for auth — matches the ChatGPT Sep 15 reference
 * (robot, glass cubes, floating cards, handwritten labels, soft lavender grid).
 * CSS-only so the auth layout stays free of binary/data-URI module issues.
 */
export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden bg-[#eef1ff]">
      <ExactRobotScene />
      {/* Soft edge so the form panel blends cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/40 to-transparent"
      />
    </div>
  );
}

function ExactRobotScene() {
  return (
    <div className="absolute inset-0 select-none" aria-hidden>
      {/* soft lavender grid + glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 42% at 50% 40%, rgba(186,170,255,0.35), transparent 70%), linear-gradient(180deg,#f7f5ff 0%,#eef1ff 50%,#f3f5fb 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right,rgba(120,130,220,0.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(120,130,220,0.07) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 40%,#000 20%,transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 40%,#000 20%,transparent 80%)",
        }}
      />

      {/* floating ribbon top-right */}
      <div className="absolute -right-8 top-8 h-48 w-48 rounded-full bg-gradient-to-br from-violet-300/50 to-indigo-400/30 blur-2xl" />

      {/* cubes bottom-left */}
      <div
        className="absolute bottom-[12%] left-[8%]"
        style={{ transform: "rotate(-12deg)" }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-lg"
            style={{
              background: `linear-gradient(145deg, hsl(${250 + i * 4}, 70%, ${72 - (i % 3) * 6}%), hsl(${260 + i * 3}, 65%, ${58 - (i % 2) * 5}%))`,
              boxShadow:
                "0 8px 20px rgba(100,90,200,0.25), inset 0 1px 0 rgba(255,255,255,0.5)",
              position: "absolute",
              left: (i % 3) * 28,
              top: Math.floor(i / 3) * 28,
            }}
          />
        ))}
      </div>

      {/* center robot */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-44 w-44">
          <div className="absolute inset-x-[18%] bottom-0 top-[28%] rounded-[40%] bg-gradient-to-b from-white to-[#e8e4ff] shadow-[0_20px_40px_rgba(100,90,200,0.3)]" />
          <div className="absolute inset-x-[12%] top-0 h-[58%] rounded-[48%] bg-gradient-to-b from-white via-[#f4f2ff] to-[#ddd6fe] shadow-[0_12px_30px_rgba(90,80,180,0.35)]">
            <div className="absolute inset-x-[14%] top-[22%] flex h-[42%] items-center justify-center gap-3 rounded-full bg-[#1e1b4b]">
              <div
                className="h-2.5 w-6 rounded-full bg-[#a5b4fc]"
                style={{ boxShadow: "0 0 12px #818cf8" }}
              />
              <div
                className="h-2.5 w-6 rounded-full bg-[#a5b4fc]"
                style={{ boxShadow: "0 0 12px #818cf8" }}
              />
            </div>
            <div className="absolute -left-3 top-[35%] h-8 w-5 rounded-full bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa]" />
            <div className="absolute -right-3 top-[35%] h-8 w-5 rounded-full bg-gradient-to-l from-[#c4b5fd] to-[#a78bfa]" />
            <div className="absolute left-1/2 top-0 h-3 w-1.5 -translate-x-1/2 -translate-y-full rounded-t-full bg-[#c4b5fd]" />
          </div>
          <div className="absolute bottom-[18%] left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-[#6366f1] text-sm font-bold text-white shadow-md">
            T
          </div>
          <div className="absolute -left-2 top-[48%] h-10 w-10 -rotate-45 rounded-full bg-gradient-to-br from-white to-[#ddd6fe]" />
          <div className="absolute -right-2 top-[48%] h-10 w-10 rotate-45 rounded-full bg-gradient-to-bl from-white to-[#ddd6fe]" />
        </div>
      </div>

      {/* floating cards */}
      <div className="absolute left-[12%] top-[28%] flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-lg backdrop-blur">
        💡
      </div>
      <div className="absolute right-[14%] top-[36%] flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl bg-white/80 p-2 shadow-lg backdrop-blur">
        <div className="h-1 w-8 rounded bg-indigo-200" />
        <div className="h-1 w-6 rounded bg-indigo-100" />
        <div className="h-1 w-7 rounded bg-indigo-100" />
      </div>

      {/* handwritten-style labels */}
      <p
        className="absolute left-[18%] top-[18%] rotate-[-6deg] text-[13px] font-medium text-indigo-700/80"
        style={{ fontFamily: "Georgia, serif" }}
      >
        From ideas to real outcomes.
      </p>
      <p
        className="absolute right-[12%] top-[20%] rotate-[4deg] text-[13px] font-medium text-indigo-700/80"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Your AI workspace for what's next.
      </p>
      <p
        className="absolute bottom-[22%] right-[10%] text-[13px] font-medium leading-snug text-indigo-800/80"
        style={{ fontFamily: "Georgia, serif" }}
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
        className="absolute bottom-[12%] right-[18%] rotate-[-3deg] text-[13px] font-medium text-indigo-700/80"
        style={{ fontFamily: "Georgia, serif" }}
      >
        A more productive you.
      </p>
    </div>
  );
}
