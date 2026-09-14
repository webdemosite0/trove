import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

/**
 * Light auth layout inspired by clean SaaS sign-in (soft mesh + testimonial).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-[#f7f7f8] text-zinc-900">
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[48%] lg:px-14 xl:px-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(167,139,250,0.08), transparent 50%)",
          }}
        />
        <Link href="/" className="relative mb-10 inline-flex w-fit">
          <BrandLockup orbSize={32} wordSize={22} sweep={false} />
        </Link>
        <div className="relative mx-auto w-full max-w-[400px] lg:mx-0">{children}</div>
        <p className="relative mt-10 text-center text-[12px] text-zinc-500 lg:text-left">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] lg:items-center lg:justify-center lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 70% 35%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(ellipse 45% 40% at 20% 80%, rgba(16,185,129,0.10), transparent 50%), linear-gradient(160deg, #eef2ff 0%, #f8fafc 50%, #f0fdf4 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(99,102,241,0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 max-w-md rounded-[16px] border border-zinc-200/80 bg-white/80 p-7 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <p className="text-[15px] font-semibold tracking-tight text-zinc-900">
            Builders choose Trove
          </p>
          <blockquote className="mt-4 text-[15px] leading-relaxed text-zinc-600">
            “We went from a rough idea to a live multi-page site in one afternoon.
            Publish to a real subdomain and keep refining in chat — it just works.”
          </blockquote>
          <div className="mt-5">
            <p className="text-[13.5px] font-medium text-zinc-900">Arayan K.</p>
            <p className="text-[12.5px] text-zinc-500">Founder · shipped on troveai.site</p>
          </div>
        </div>
      </div>
    </div>
  );
}
