import { Bot, SPECIES } from "@/components/agents/bot";

/** Shown on phones/tablets: Tros is a desktop-only workspace. */
export function TrosDesktopOnly() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-[480px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_15%,rgba(139,92,246,0.18),transparent_55%)]" />
      <div className="flex items-end justify-center" aria-hidden>
        {SPECIES.slice(0, 3).map((s, i) => (
          <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 3 - i }}>
            <Bot size={i === 1 ? 76 : 60} species={s} state="idle" />
          </div>
        ))}
      </div>
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Tros</p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">Desktop-only workspace</h1>
      <p className="mt-3 max-w-[40ch] text-[14.5px] leading-relaxed text-ink-3">
        Your specialists need the full Trove workspace — cloud computer, task panel and all.
        Open Trove on your computer to meet your team.
      </p>
    </div>
  );
}
