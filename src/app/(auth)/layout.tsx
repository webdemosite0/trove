import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

/**
 * Centered auth shell — soft canvas, single focused card.
 * Decorative floating frames removed (they rendered as stray diagonal lines).
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
