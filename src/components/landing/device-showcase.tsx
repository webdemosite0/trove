import { TroveOrb } from "@/components/brand/orb";

/**
 * Product proof as a device cluster (tablet + phone) — static UI screenshot style,
 * not video. Mirrors the real workspace: chat + preview.
 */
export function DeviceShowcase() {
  return (
    <section className="relative overflow-hidden px-4 py-14 sm:px-5 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1100px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
          Product view
        </p>
        <h2 className="mx-auto mt-3 max-w-[28ch] text-[clamp(1.75rem,1.2rem+1.8vw,2.65rem)] font-semibold tracking-[-0.03em] text-ink">
          Chat on one side. Your work on the other.
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-ink-3 sm:text-[16px]">
          Same workspace on every screen — refine in chat, watch the document, sheet, or site update live.
        </p>
      </div>

      <div className="relative mx-auto mt-12 flex max-w-[980px] items-end justify-center gap-0 sm:mt-14">
        {/* Soft glow behind devices */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-0 top-1/4 -z-10 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent 70%)",
          }}
        />

        {/* Tablet / desktop frame */}
        <div className="relative z-[1] w-full max-w-[720px] shrink-0">
          <div className="rounded-[22px] border border-line bg-zinc-900 p-[10px] shadow-[0_40px_100px_-36px_rgba(15,23,42,0.45)] dark:bg-zinc-950 sm:rounded-[28px] sm:p-3">
            <div className="overflow-hidden rounded-[14px] border border-line bg-canvas sm:rounded-[18px]">
              {/* Window chrome */}
              <div className="flex h-9 items-center gap-2 border-b border-line bg-rail px-3 sm:h-10 sm:px-4">
                <span className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-zinc-400/50 sm:size-2.5" />
                  <span className="size-2 rounded-full bg-zinc-400/50 sm:size-2.5" />
                  <span className="size-2 rounded-full bg-zinc-400/50 sm:size-2.5" />
                </span>
                <span className="ml-2 flex min-w-0 flex-1 items-center gap-2">
                  <TroveOrb size={16} />
                  <span className="truncate text-[11px] font-semibold text-ink sm:text-[12.5px]">
                    Trove — Documents
                  </span>
                </span>
                <span className="hidden rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 sm:inline">
                  Live preview
                </span>
              </div>

              <div className="grid min-h-[280px] sm:min-h-[340px] lg:grid-cols-[240px_minmax(0,1fr)]">
                {/* Chat column */}
                <div className="hidden border-r border-line bg-rail/80 p-3 lg:block">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-4">
                    Chat
                  </p>
                  <div className="ml-auto max-w-[95%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[11px] leading-snug text-canvas">
                    Write a Q2 product launch brief for the mobile app.
                  </div>
                  <div className="mt-2.5 max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-raised px-3 py-2 text-[11px] leading-snug text-ink-2">
                    Draft ready — sections for goals, audience, timeline, and KPIs. Ask for edits anytime.
                  </div>
                  <div className="mt-4 rounded-xl border border-line bg-sunk px-2.5 py-2">
                    <p className="text-[10px] text-ink-4">Update this document…</p>
                  </div>
                </div>

                {/* Preview column */}
                <div className="bg-sunk/40 p-4 sm:p-5">
                  <div className="h-full rounded-xl border border-line bg-raised p-4 shadow-sm sm:rounded-2xl sm:p-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                      Product brief
                    </p>
                    <h3 className="mt-1.5 text-[clamp(1.1rem,0.95rem+0.8vw,1.45rem)] font-semibold tracking-tight text-ink">
                      Q2 mobile launch
                    </h3>
                    <p className="mt-2 max-w-[42ch] text-[11px] leading-relaxed text-ink-3 sm:text-[12.5px]">
                      Goals, positioning, and a four-week rollout plan — refined in the same chat that wrote it.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {["Goals", "Audience", "Timeline"].map((label) => (
                        <div
                          key={label}
                          className="rounded-lg border border-line bg-canvas px-2.5 py-2"
                        >
                          <p className="text-[9px] font-semibold text-ink-4">{label}</p>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-sunk" />
                          <div className="mt-1 h-1.5 w-2/3 rounded-full bg-sunk" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                      <span className="h-6 rounded-md bg-accent/15 px-2 text-[10px] font-medium leading-6 text-accent">
                        .docx
                      </span>
                      <span className="text-[10px] text-ink-4">Export Word · PDF · Markdown</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phone frame — overlays lower-left like the reference */}
        <div className="absolute bottom-0 left-0 z-[2] w-[min(42%,168px)] -translate-x-[4%] translate-y-[6%] sm:w-[190px] sm:-translate-x-[8%] sm:translate-y-[4%] lg:left-[4%] lg:w-[210px]">
          <div className="rounded-[28px] border-[5px] border-zinc-900 bg-zinc-900 shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55)] dark:border-zinc-800 sm:rounded-[32px] sm:border-[6px]">
            {/* Notch */}
            <div className="relative overflow-hidden rounded-[22px] bg-canvas sm:rounded-[26px]">
              <div className="flex h-7 items-center justify-center bg-rail">
                <span className="h-1.5 w-16 rounded-full bg-zinc-400/40" />
              </div>
              <div className="border-b border-line px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <TroveOrb size={14} />
                  <span className="text-[10px] font-semibold text-ink">New chat</span>
                </div>
              </div>
              <div className="space-y-2 px-2.5 py-2.5">
                <div className="rounded-2xl rounded-br-md bg-ink px-2.5 py-1.5 text-[9px] leading-snug text-canvas">
                  Build a launch brief for the mobile app.
                </div>
                <div className="rounded-2xl rounded-bl-md border border-line bg-raised px-2.5 py-1.5 text-[9px] leading-snug text-ink-2">
                  On it — opening Documents with a structured draft.
                </div>
                <div className="rounded-xl border border-line bg-sunk px-2 py-1.5">
                  <p className="text-[8px] text-ink-4">Message Trove…</p>
                </div>
                <div className="flex gap-1 pt-0.5">
                  <span className="rounded-full border border-line px-1.5 py-0.5 text-[7.5px] text-ink-3">
                    Build
                  </span>
                  <span className="rounded-full border border-line px-1.5 py-0.5 text-[7.5px] text-ink-3">
                    Write
                  </span>
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[7.5px] text-ink-2">
                    Plugins
                  </span>
                </div>
              </div>
              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
