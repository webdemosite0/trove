import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";
import { AuthIllustration } from "@/components/auth/auth-illustration";

/**
 * Premium auth shell: clean startup form on the left, immersive Trove product
 * visual on the right. On phones the visual becomes a compact editorial card
 * below the form instead of disappearing entirely.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#f4f4f6] p-2.5 sm:p-4 lg:p-5">
      <div className="mx-auto grid min-h-[calc(100dvh-20px)] w-full max-w-[1240px] overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_30px_100px_-38px_rgba(15,23,42,0.28)] sm:min-h-[calc(100dvh-32px)] sm:rounded-[34px] lg:min-h-[calc(100dvh-40px)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative flex min-w-0 flex-col px-5 py-6 sm:px-9 sm:py-8 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.08),transparent_55%)]" />

          <div className="relative flex items-center justify-between">
            <Link href="/" className="inline-flex w-fit" aria-label="Trove home">
              <BrandLockup orbSize={34} wordSize={22} sweep={false} />
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#fafafa] px-3 py-1.5 text-[11px] font-medium text-zinc-500 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Secure workspace
            </span>
          </div>

          <div className="relative my-auto w-full max-w-[410px] py-10 sm:py-12 lg:py-10">
            {children}
          </div>

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/[0.06] pt-4 text-[11px] text-zinc-400">
            <span>© {new Date().getFullYear()} Trove</span>
            <Link href="/privacy" className="transition hover:text-zinc-700">Privacy</Link>
            <Link href="/terms" className="transition hover:text-zinc-700">Terms</Link>
          </div>
        </section>

        <section className="relative min-h-[230px] border-t border-black/[0.06] lg:min-h-0 lg:border-l lg:border-t-0">
          <AuthIllustration />
        </section>
      </div>
    </main>
  );
}
