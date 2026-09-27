import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";

/**
 * Product screenshot cluster — tablet (desktop Trove dashboard) + phone (mobile),
 * composition matched to marketing device frames (no video).
 */
export function DeviceShowcase() {
  return (
    <section
      aria-label="Trove product screenshots"
      className="relative overflow-hidden px-4 py-12 sm:px-5 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1040px]">
        {/* Stage — white-space like the reference photo */}
        <div className="relative mx-auto flex min-h-[340px] items-end justify-center sm:min-h-[420px] lg:min-h-[480px]">
          {/* Soft floor shadow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] bottom-2 h-16 rounded-[100%] bg-zinc-900/10 blur-2xl dark:bg-black/40"
          />

          {/* ——— Desktop / tablet: full dashboard ——— */}
          <div className="relative z-[1] ml-[8%] w-full max-w-[720px] sm:ml-[10%] lg:max-w-[780px]">
            <div className="rounded-[18px] bg-zinc-900 p-[9px] shadow-[0_50px_100px_-40px_rgba(15,23,42,0.55)] ring-1 ring-black/20 dark:bg-zinc-950 sm:rounded-[22px] sm:p-[11px]">
              {/* Bezel camera dot */}
              <div className="mb-1.5 flex justify-center sm:mb-2">
                <span className="size-1 rounded-full bg-zinc-600 sm:size-1.5" />
              </div>

              <div className="overflow-hidden rounded-[11px] bg-canvas sm:rounded-[14px]">
                <div className="flex min-h-[260px] sm:min-h-[340px] lg:min-h-[380px]">
                  {/* Dark sidebar — desktop Trove rail */}
                  <aside className="hidden w-[148px] shrink-0 flex-col bg-[#111318] text-white sm:flex lg:w-[168px]">
                    <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
                      <TroveOrb size={20} />
                      <Wordmark size={14} className="text-white" />
                    </div>
                    <div className="px-2.5 pt-2.5">
                      <div className="flex h-8 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-semibold">
                        + New chat
                      </div>
                    </div>
                    <nav className="mt-2 space-y-0.5 px-2 text-[10.5px]">
                      {[
                        { label: "Home", on: true },
                        { label: "Chat", on: false },
                        { label: "Documents", on: false },
                        { label: "Spreadsheets", on: false },
                        { label: "Slides", on: false },
                        { label: "Websites", on: false },
                        { label: "Agents", on: false },
                        { label: "Plugins", on: false },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg px-2.5 py-1.5 ${
                            item.on
                              ? "bg-white/12 font-medium text-white"
                              : "text-white/55"
                          }`}
                        >
                          {item.label}
                        </div>
                      ))}
                    </nav>
                    <div className="mt-auto border-t border-white/10 px-3 py-2.5">
                      <p className="text-[9px] text-white/45">200 / 500 credits</p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[40%] rounded-full bg-violet-500" />
                      </div>
                    </div>
                  </aside>

                  {/* Main dashboard */}
                  <div className="min-w-0 flex-1 bg-[#f7f7f9] dark:bg-[#0c0d10]">
                    {/* Top bar */}
                    <div className="flex h-9 items-center justify-between border-b border-line bg-canvas px-3 sm:h-10 sm:px-4">
                      <span className="text-[11px] font-semibold text-ink sm:text-[12px]">
                        Home
                      </span>
                      <span className="text-[9px] text-ink-4 sm:text-[10px]">
                        you@trove.app
                      </span>
                    </div>

                    <div className="px-3 py-3 sm:px-5 sm:py-4">
                      <p className="text-center text-[9px] text-ink-4 sm:text-[10px]">
                        Good afternoon
                      </p>
                      <h3 className="mt-0.5 text-center text-[13px] font-semibold tracking-tight text-ink sm:text-[16px]">
                        What will you build today?
                      </h3>

                      {/* Composer */}
                      <div className="mx-auto mt-2.5 max-w-[420px] rounded-xl border border-line bg-raised p-2.5 shadow-sm sm:mt-3 sm:rounded-2xl sm:p-3">
                        <p className="text-[9px] text-ink-4 sm:text-[10px]">
                          Describe anything you want Trove to build…
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            <span className="rounded-md border border-line px-1.5 py-0.5 text-[8px] text-ink-3">
                              Attach
                            </span>
                            <span className="rounded-md border border-line px-1.5 py-0.5 text-[8px] text-ink-3">
                              Voice
                            </span>
                          </div>
                          <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[9px] text-white sm:size-6">
                            ↑
                          </span>
                        </div>
                      </div>

                      {/* Suggestion chips */}
                      <div className="mx-auto mt-2 flex max-w-[420px] flex-wrap justify-center gap-1">
                        {["Landing page", "Report", "Sheet", "Pitch deck"].map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[8px] text-ink-3 sm:text-[9px]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      {/* Recent work cards — dashboard proof */}
                      <div className="mx-auto mt-3 max-w-[480px] sm:mt-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-medium text-ink-3 sm:text-[10px]">
                            Recent work
                          </span>
                          <span className="text-[8px] text-violet-600 sm:text-[9px]">View all</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
                          {[
                            { t: "SaaS Landing", m: "Website", c: "#8b5cf6" },
                            { t: "Q2 Model", m: "Sheet", c: "#22c55e" },
                            { t: "Pitch Deck", m: "Slides", c: "#f97316" },
                            { t: "Launch Brief", m: "Doc", c: "#6366f1" },
                          ].map((card) => (
                            <div
                              key={card.t}
                              className="overflow-hidden rounded-lg border border-line bg-canvas"
                            >
                              <div
                                className="h-7 sm:h-9"
                                style={{
                                  background: `linear-gradient(135deg, ${card.c}99, #1e1b2e)`,
                                }}
                              />
                              <div className="px-1.5 py-1">
                                <p className="truncate text-[8px] font-medium text-ink sm:text-[9px]">
                                  {card.t}
                                </p>
                                <p className="text-[7px] text-ink-4">{card.m}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats strip */}
                      <div className="mx-auto mt-3 hidden max-w-[480px] grid-cols-3 gap-2 sm:mt-4 sm:grid">
                        {[
                          { k: "Credits left", v: "200" },
                          { k: "This week", v: "12 files" },
                          { k: "Plugins", v: "Connected" },
                        ].map((s) => (
                          <div
                            key={s.k}
                            className="rounded-lg border border-line bg-canvas px-2.5 py-2"
                          >
                            <p className="text-[8px] text-ink-4">{s.k}</p>
                            <p className="mt-0.5 text-[12px] font-semibold text-ink">{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ——— Phone: mobile Trove ——— */}
          <div className="absolute bottom-0 left-0 z-[2] w-[min(46%,172px)] translate-y-[4%] sm:left-[2%] sm:w-[200px] sm:translate-y-[2%] lg:left-[4%] lg:w-[220px]">
            <div className="rounded-[32px] bg-zinc-900 p-[7px] shadow-[0_32px_64px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/30 sm:rounded-[36px] sm:p-[8px]">
              <div className="relative overflow-hidden rounded-[26px] bg-canvas sm:rounded-[30px]">
                {/* Status bar */}
                <div className="flex h-6 items-center justify-between bg-canvas px-3.5 pt-1">
                  <span className="text-[8px] font-semibold tabular-nums text-ink">9:41</span>
                  <span className="absolute left-1/2 top-1.5 h-3.5 w-16 -translate-x-1/2 rounded-full bg-zinc-900" />
                  <span className="text-[7px] text-ink-3">●●●</span>
                </div>

                {/* Mobile header */}
                <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2">
                  <span className="grid size-6 place-items-center rounded-md text-ink-3">☰</span>
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
                    <TroveOrb size={14} />
                    <span className="text-[10px] font-semibold text-ink">Trove</span>
                  </div>
                  <span className="grid size-6 place-items-center text-[12px] text-ink-3">+</span>
                </div>

                <div className="space-y-2 px-2.5 py-2.5">
                  <p className="text-center text-[8px] text-ink-4">Home</p>
                  <p className="text-center text-[11px] font-semibold text-ink">
                    What will you build?
                  </p>

                  <div className="rounded-xl border border-line bg-raised p-2">
                    <p className="text-[8px] text-ink-4">Message Trove…</p>
                    <div className="mt-2 flex justify-end">
                      <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[8px] text-white">
                        ↑
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {["Website", "Doc", "Sheet"].map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-line px-1.5 py-0.5 text-[7.5px] text-ink-3"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-xl border border-line bg-raised p-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[10px] text-violet-600">
                        📄
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-medium text-ink">Launch brief</p>
                        <p className="text-[7.5px] text-ink-4">Document · 2m ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-raised p-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-[10px] text-emerald-600">
                        📊
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-medium text-ink">Q2 model</p>
                        <p className="text-[7.5px] text-ink-4">Spreadsheet · 1h ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom tabs */}
                <div className="mt-1 flex border-t border-line bg-canvas px-1 py-1.5">
                  {["Chat", "Home", "Docs", "Agents", "Plugins"].map((t, i) => (
                    <div
                      key={t}
                      className={`flex flex-1 flex-col items-center gap-0.5 text-[6.5px] ${
                        i === 1 ? "font-semibold text-violet-600" : "text-ink-4"
                      }`}
                    >
                      <span className="text-[9px]">{["💬", "⌂", "📄", "✦", "🔌"][i]}</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-[42ch] text-center text-[13px] text-ink-3 sm:mt-12 sm:text-[14.5px]">
          Desktop dashboard and mobile app — same workspace, every screen.
        </p>
      </div>
    </section>
  );
}
