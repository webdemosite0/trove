import Link from "next/link";
import {
  FiFolder,
  FiMessageSquare,
  FiShield,
  FiZap,
} from "@/components/ui/icons";
import { BrandLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";

const BENEFITS = [
  {
    icon: FiMessageSquare,
    title: "One AI workspace",
    body: "Chat, build, research, and create without jumping between tools.",
    tone: "from-violet-500/18 to-fuchsia-500/10 text-violet-600 dark:text-violet-300",
  },
  {
    icon: FiFolder,
    title: "Projects with context",
    body: "Keep files, prompts, integrations, and project history together.",
    tone: "from-sky-500/18 to-cyan-500/10 text-sky-600 dark:text-sky-300",
  },
  {
    icon: FiZap,
    title: "Connected actions",
    body: "Use your integrations and business context directly from Trove.",
    tone: "from-amber-400/18 to-orange-500/10 text-amber-700 dark:text-amber-300",
  },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 12%, color-mix(in oklab, var(--color-violet) 20%, transparent), transparent 34%), radial-gradient(circle at 92% 8%, color-mix(in oklab, var(--color-accent) 17%, transparent), transparent 30%), radial-gradient(circle at 78% 92%, rgba(236,72,153,.10), transparent 32%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            aria-label="Trove home"
          >
            <BrandLockup orbSize={30} wordSize={20} sweep={false} />
          </Link>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)] lg:gap-12 xl:gap-16">
          <aside className="relative hidden min-h-[640px] overflow-hidden rounded-[34px] border border-line-strong bg-raised/72 p-8 shadow-[var(--elev-lift)] backdrop-blur-xl lg:flex lg:flex-col xl:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(145deg, color-mix(in oklab, var(--color-violet) 15%, transparent), transparent 42%), radial-gradient(circle at 88% 14%, rgba(56,189,248,.18), transparent 30%), radial-gradient(circle at 12% 90%, rgba(236,72,153,.12), transparent 34%)",
              }}
            />

            <div className="relative z-10 max-w-[600px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
                Your AI business workspace
              </span>

              <h2 className="mt-6 max-w-[11ch] text-[clamp(2.2rem,4vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-ink">
                Turn work into progress.
              </h2>
              <p className="mt-5 max-w-[48ch] text-[15px] leading-7 text-ink-3">
                Trove keeps your business context, connected tools, projects, and AI work in one place—so every new task starts with context instead of a blank screen.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid gap-3 xl:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, body, tone }) => (
                <div
                  key={title}
                  className="rounded-[20px] border border-line bg-canvas/50 p-4 backdrop-blur-sm"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${tone}`}
                  >
                    <Icon size={17} />
                  </span>
                  <p className="mt-3 text-[12.5px] font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-[11.5px] leading-5 text-ink-4">{body}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-auto pt-8">
              <div className="overflow-hidden rounded-[26px] border border-line-strong bg-canvas/70 p-3 shadow-[var(--sh-2)] backdrop-blur-sm">
                <div className="rounded-[20px] border border-line bg-raised p-3">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <span className="size-2 rounded-full bg-rose-400/70" />
                    <span className="size-2 rounded-full bg-amber-400/70" />
                    <span className="size-2 rounded-full bg-emerald-400/70" />
                    <span className="ml-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                      Trove · Project workspace
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-[150px_1fr] gap-3">
                    <div className="space-y-2 rounded-2xl border border-line bg-sunk/70 p-2.5">
                      {["Chat", "Projects", "Integrations", "Automations"].map((item, index) => (
                        <div
                          key={item}
                          className={
                            index === 1
                              ? "rounded-xl bg-gradient-to-r from-violet-500/12 to-sky-500/10 px-2.5 py-2 text-[10.5px] font-semibold text-ink"
                              : "rounded-xl px-2.5 py-2 text-[10.5px] text-ink-4"
                          }
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-line bg-sunk/55 p-3">
                      <div className="rounded-xl border border-line bg-raised p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold text-ink">Launch workspace</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300">
                            Ready
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-2.5 w-[62%] rounded-full bg-gradient-to-r from-violet-500/40 to-sky-500/30" />
                          <div className="h-2 w-full rounded-full bg-ink/[0.07]" />
                          <div className="h-2 w-[82%] rounded-full bg-ink/[0.06]" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="h-14 rounded-xl bg-violet-500/10" />
                          <div className="h-14 rounded-xl bg-sky-500/10" />
                          <div className="h-14 rounded-xl bg-fuchsia-500/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="mx-auto flex w-full max-w-[500px] flex-col justify-center lg:max-w-[470px]">
            <div className="rounded-[28px] border border-line-strong bg-raised/88 px-5 py-7 shadow-[var(--elev-lift)] backdrop-blur-xl sm:px-8 sm:py-9">
              <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
                <BrandLockup orbSize={28} wordSize={19} sweep={false} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunk px-2.5 py-1 text-[10px] font-medium text-ink-4">
                  <FiShield size={11} />
                  Secure workspace
                </span>
              </div>
              {children}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10.5px] text-ink-4">
              <span className="inline-flex items-center gap-1">
                <FiShield size={11} />
                Secure sign-in
              </span>
              <span aria-hidden>·</span>
              <Link href="/privacy" className="transition hover:text-ink-2">
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="transition hover:text-ink-2">
                Terms
              </Link>
              <span aria-hidden>·</span>
              <span>© {new Date().getFullYear()} Trove</span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
