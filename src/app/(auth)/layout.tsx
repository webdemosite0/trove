import type { Metadata } from "next";
import Link from "next/link";
import {
  FiFolder,
  FiMessageSquare,
  FiShield,
  FiZap,
} from "@/components/ui/icons";
import { BrandLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";

/** Auth pages (login/signup) must never appear in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const BENEFITS = [
  {
    icon: FiMessageSquare,
    title: "One AI workspace",
    body: "Chat, build, research, and create without jumping between tools.",
    tone: "bg-white/15 text-white",
  },
  {
    icon: FiFolder,
    title: "Projects with context",
    body: "Keep files, prompts, integrations, and project history together.",
    tone: "bg-white/15 text-white",
  },
  {
    icon: FiZap,
    title: "Connected actions",
    body: "Use your integrations and business context directly from Trove.",
    tone: "bg-white/15 text-white",
  },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas text-ink">
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
          <aside className="lv-hero lv-hero--compact relative hidden min-h-[640px] overflow-hidden rounded-[var(--r-hero)] p-8 text-white lg:flex lg:flex-col xl:p-10">

            <div className="relative z-10 max-w-[600px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85 backdrop-blur">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Your AI business workspace
              </span>

              <h2 className="mt-6 max-w-[14ch] text-[clamp(2rem,3vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
                Turn work into progress.
              </h2>
              <p className="mt-5 max-w-[48ch] text-[15px] leading-7 text-white/75">
                Trove keeps your business context, connected tools, projects, and AI work in one place—so every new task starts with context instead of a blank screen.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid gap-3 xl:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, body, tone }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                >
                  <span
                    className={`grid size-9 place-items-center rounded-[var(--r-control)] ${tone}`}
                  >
                    <Icon size={17} />
                  </span>
                  <p className="mt-3 text-[12.5px] font-semibold text-white">{title}</p>
                  <p className="mt-1 text-[11.5px] leading-5 text-white/70">{body}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-auto pt-8">
              <div className="overflow-hidden rounded-xl border border-line bg-canvas p-3 shadow-[var(--shadow-sm)]">
                <div className="rounded-xl border border-line bg-raised p-3">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <span className="size-2 rounded-full bg-rose-400/70" />
                    <span className="size-2 rounded-full bg-amber-400/70" />
                    <span className="size-2 rounded-full bg-emerald-400/70" />
                    <span className="ml-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                      Trove · Project workspace
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-[150px_1fr] gap-3">
                    <div className="space-y-2 rounded-xl border border-line bg-sunk/70 p-2.5">
                      {["Chat", "Projects", "Integrations", "Automations"].map((item, index) => (
                        <div
                          key={item}
                          className={
                            index === 1
                              ? "rounded-md bg-hover px-2.5 py-2 text-[10.5px] font-medium text-ink"
                              : "rounded-md px-2.5 py-2 text-[10.5px] text-ink-4"
                          }
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-line bg-sunk/55 p-3">
                      <div className="rounded-xl border border-line bg-raised p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold text-ink">Launch workspace</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300">
                            Ready
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-2.5 w-[62%] rounded-full bg-accent/40" />
                          <div className="h-2 w-full rounded-full bg-ink/[0.07]" />
                          <div className="h-2 w-[82%] rounded-full bg-ink/[0.06]" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="h-14 rounded-lg bg-sunk" />
                          <div className="h-14 rounded-lg bg-sunk" />
                          <div className="h-14 rounded-lg bg-sunk" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="mx-auto flex w-full max-w-[500px] flex-col justify-center lg:max-w-[470px]">
            <div className="rounded-xl border border-line bg-raised px-5 py-7 shadow-[var(--shadow-sm)] sm:px-8 sm:py-9">
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
