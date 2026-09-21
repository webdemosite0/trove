import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

/**
 * Centered auth shell inspired by modern SaaS signup (soft canvas, floating
 * product frames, single focused card). Login and signup share this chrome.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10 sm:px-6">
      {/* Soft grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 45%, black 20%, transparent 75%)",
        }}
      />
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-sky-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-1/4 h-[380px] w-[380px] rounded-full bg-indigo-300/20 blur-3xl"
      />

      {/* Floating product mockups — left */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-8%] top-[12%] hidden w-[280px] rotate-[-8deg] lg:block xl:left-[4%] xl:w-[320px]"
      >
        <div className="rounded-2xl border border-line bg-raised/90 p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <span className="size-2 rounded-full bg-red-400/80" />
            <span className="size-2 rounded-full bg-amber-400/80" />
            <span className="size-2 rounded-full bg-emerald-400/80" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["#f0abfc", "#93c5fd", "#86efac", "#fcd34d"].map((c, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl"
                style={{
                  background: `linear-gradient(145deg, ${c}, white 120%)`,
                }}
              />
            ))}
          </div>
          <div className="mt-2.5 h-2 w-2/3 rounded-full bg-line-strong" />
          <div className="mt-1.5 h-2 w-1/2 rounded-full bg-sunk" />
        </div>
      </div>

      {/* Floating product mockups — right */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-6%] bottom-[10%] hidden w-[260px] rotate-[7deg] lg:block xl:right-[5%] xl:w-[300px]"
      >
        <div className="rounded-2xl border border-line bg-raised/90 p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="mb-2 h-24 rounded-xl bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100" />
          <div className="space-y-1.5 px-0.5">
            <div className="h-2 w-3/4 rounded-full bg-line-strong" />
            <div className="h-2 w-1/2 rounded-full bg-sunk" />
            <div className="mt-2 h-8 w-full rounded-lg bg-sky-200/70" />
          </div>
        </div>
      </div>

      {/* Small floating chips */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[18%] top-[18%] hidden size-12 items-center justify-center rounded-2xl border border-line bg-raised shadow-lg lg:flex"
      >
        <span className="text-lg">✦</span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute right-[20%] top-[22%] hidden size-11 items-center justify-center rounded-2xl border border-line bg-raised shadow-lg lg:flex"
      >
        <span className="text-base">◇</span>
      </div>

      {/* Center card */}
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-[28px] border border-line bg-raised px-7 py-9 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.22)] sm:px-10 sm:py-11">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="inline-flex" aria-label="Trove home">
              <BrandLockup orbSize={34} wordSize={22} sweep={false} />
            </Link>
          </div>
          {children}
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-4">
          <Link href="/privacy" className="transition hover:text-ink-2">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="transition hover:text-ink-2">
            Terms
          </Link>
          <span className="mx-2">·</span>
          © {new Date().getFullYear()} Trove
        </p>
      </div>
    </main>
  );
}
