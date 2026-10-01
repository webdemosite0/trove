import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";

/**
 * Desktop-only product proof: looks like a real Trove browser window (dashboard).
 * Hidden on mobile — no marketing device frames on small screens.
 */
export function DeviceShowcase() {
  return (
    <section
      aria-label="Trove dashboard preview"
      className="relative hidden overflow-hidden px-5 py-10 md:block lg:py-14"
    >
      <div className="mx-auto max-w-[1080px]">
        {/* Browser window — real screenshot feel */}
        <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-[0_32px_80px_-28px_rgba(15,23,42,0.35)] ring-1 ring-black/5 dark:ring-white/10">
          {/* Browser chrome */}
          <div className="flex h-10 items-center gap-3 border-b border-line bg-rail px-3">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-zinc-400/55" />
              <span className="size-2.5 rounded-full bg-zinc-400/55" />
              <span className="size-2.5 rounded-full bg-zinc-400/55" />
            </span>
            <div className="flex h-6 min-w-0 flex-1 items-center justify-center rounded-md border border-line bg-sunk px-3">
              <span className="truncate text-[11px] text-ink-4">troveai.site / dashboard</span>
            </div>
          </div>

          <div className="flex min-h-[400px] lg:min-h-[460px]">
            {/* App sidebar */}
            <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-rail lg:w-[220px]">
              <div className="flex items-center gap-2 border-b border-line px-3 py-3">
                <TroveOrb size={22} />
                <Wordmark size={15} />
              </div>
              <div className="px-2.5 pt-2.5">
                <div className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[12px] font-semibold text-white">
                  + New chat
                </div>
              </div>
              <nav className="mt-2 space-y-0.5 px-2 text-[13px]">
                {[
                  { label: "Home", on: true },
                  { label: "Chat", on: false },
                  { label: "Documents", on: false },
                  { label: "Spreadsheets", on: false },
                  { label: "Decks", on: false },
                  { label: "Websites", on: false },
                  { label: "Agents", on: false },
                  { label: "Plugins", on: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl px-2.5 py-2 ${
                      item.on
                        ? "bg-hover font-medium text-ink"
                        : "text-ink-3"
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </nav>
              <div className="mt-auto border-t border-line px-3 py-3">
                <p className="text-[11px] text-ink-4">200 / 500 credits</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunk">
                  <div className="h-full w-[40%] rounded-full bg-violet-500" />
                </div>
              </div>
            </aside>

            {/* Dashboard main */}
            <div className="min-w-0 flex-1 bg-canvas">
              <div className="flex h-11 items-center justify-between border-b border-line px-5">
                <span className="text-[13px] font-semibold text-ink">Home</span>
                <span className="text-[12px] text-ink-4">you@troveai.site</span>
              </div>

              <div className="px-6 py-6 lg:px-10 lg:py-8">
                <p className="text-center text-[12px] text-ink-4">Good afternoon</p>
                <h3 className="mt-1 text-center text-[22px] font-semibold tracking-tight text-ink lg:text-[26px]">
                  What will you build today?
                </h3>

                <div className="mx-auto mt-5 max-w-[520px] rounded-2xl border border-line bg-raised p-4 shadow-sm">
                  <p className="text-[13px] text-ink-4">
                    Describe anything you want Trove to build…
                  </p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-3">
                        Attach
                      </span>
                      <span className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-3">
                        Voice
                      </span>
                    </div>
                    <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm text-white">
                      ↑
                    </span>
                  </div>
                </div>

                <div className="mx-auto mt-3 flex max-w-[520px] flex-wrap justify-center gap-1.5">
                  {["Landing page", "Report", "Sheet", "Pitch deck", "Agent"].map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] text-ink-3"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="mx-auto mt-8 max-w-[640px]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-ink-3">Recent work</span>
                    <span className="text-[11px] text-violet-600">View all</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { t: "SaaS Landing", m: "Website", c: "#8b5cf6" },
                      { t: "Q2 Model", m: "Sheet", c: "#22c55e" },
                      { t: "Pitch Deck", m: "Decks", c: "#f97316" },
                      { t: "Launch Brief", m: "Doc", c: "#6366f1" },
                    ].map((card) => (
                      <div
                        key={card.t}
                        className="overflow-hidden rounded-xl border border-line bg-raised"
                      >
                        <div
                          className="h-12"
                          style={{
                            background: `linear-gradient(135deg, ${card.c}aa, #1e1b2e)`,
                          }}
                        />
                        <div className="px-2.5 py-2">
                          <p className="truncate text-[12px] font-medium text-ink">{card.t}</p>
                          <p className="text-[10px] text-ink-4">{card.m}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
