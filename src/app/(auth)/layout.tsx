import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";
import { AuthIllustration } from "@/components/auth/auth-illustration";

/**
 * Responsive auth shell: compact on laptops, full-width on phones, and capped
 * on large displays so the sign-in experience never feels oversized.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f4f6] p-2 sm:p-3 lg:p-4">
      <div className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_24px_80px_-38px_rgba(15,23,42,0.24)] sm:rounded-[28px] lg:min-h-[min(700px,calc(100dvh-32px))] lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative flex min-w-0 flex-col px-5 py-5 sm:px-7 sm:py-6 lg:px-9 lg:py-7 xl:px-11 xl:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.07),transparent_58%)]" />

          <div className="relative flex items-center justify-between">
            <Link href="/" className="inline-flex w-fit" aria-label="Trove home">
              <BrandLockup orbSize={30} wordSize={19} sweep={false} />
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#fafafa] px-2.5 py-1 text-[10px] font-medium text-zinc-500 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Secure workspace
            </span>
          </div>

          <div className="relative my-auto w-full max-w-[370px] py-6 sm:py-7 lg:py-5">
            {children}
          </div>

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/[0.06] pt-3 text-[10.5px] text-zinc-400">
            <span>© {new Date().getFullYear()} Trove</span>
            <Link href="/privacy" className="transition hover:text-zinc-700">Privacy</Link>
            <Link href="/terms" className="transition hover:text-zinc-700">Terms</Link>
          </div>
        </section>

        <section className="relative min-h-[190px] border-t border-black/[0.06] sm:min-h-[220px] lg:min-h-0 lg:border-l lg:border-t-0">
          <AuthIllustration />
        </section>
      </div>
    </main>
  );
}
