"use client";

/**
 * Immersive product visual for auth. Uses Trove's existing Studio footage so
 * the page feels like the actual product rather than a generic illustration.
 */
export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-[230px] w-full overflow-hidden bg-[#111217] lg:min-h-[640px]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src="/auth/studio.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,14,0.04)_0%,rgba(10,10,14,0.20)_42%,rgba(10,10,14,0.80)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_20%,rgba(124,92,255,0.28),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(59,130,246,0.24),transparent_32%)]" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5 lg:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/82 backdrop-blur-xl sm:text-[11px]">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
          Trove Studio · Live
        </div>
        <div className="hidden rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-xl sm:block">
          Prompt → build → publish
        </div>
      </div>

      <div className="absolute left-4 top-[30%] hidden w-[210px] rounded-[22px] border border-white/14 bg-black/24 p-4 text-white shadow-2xl backdrop-blur-2xl sm:block lg:left-6 lg:top-[31%]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">Your work</p>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-medium text-emerald-200">Ready</span>
        </div>
        <p className="mt-3 text-[14px] font-semibold leading-snug">Launch-ready website</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/8 p-2.5">
          <div className="h-1.5 w-16 rounded-full bg-white/70" />
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/15" />
          <div className="mt-1.5 h-1.5 w-[72%] rounded-full bg-white/10" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="h-8 rounded-lg bg-violet-400/20" />
            <div className="h-8 rounded-lg bg-blue-400/20" />
            <div className="h-8 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-8 xl:p-10">
        <div className="max-w-[520px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            AI that ships real files
          </p>
          <h2 className="mt-2 max-w-[16ch] text-[24px] font-semibold leading-[1.03] tracking-[-0.035em] text-white sm:text-[28px] lg:text-[34px] xl:text-[38px]">
            Go from an idea to something you can actually use.
          </h2>
          <p className="mt-3 max-w-[48ch] text-[12px] leading-5 text-white/66 sm:text-[13px] lg:text-[14px]">
            Websites, documents, spreadsheets, presentations and code — built in one workspace and kept with the project.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 lg:mt-5">
            {["Website", "DOCX", "XLSX", "PPTX", "Code"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-white/72 backdrop-blur-md sm:text-[11px]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-14 bg-gradient-to-r from-black/10 to-transparent lg:block" />
    </div>
  );
}
