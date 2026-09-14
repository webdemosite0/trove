import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

/**
 * Vapi-inspired split auth: form column + dark gradient testimonial panel.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-[#0a0a0b] text-white">
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[48%] lg:px-14 xl:px-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 20% 0%, rgba(99,102,241,0.18), transparent 55%)",
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
              "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(16,185,129,0.12), transparent 55%), radial-gradient(ellipse 40% 40% at 30% 80%, rgba(99,102,241,0.15), transparent 50%), #0c0c0e",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(52,211,153,0.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 max-w-md rounded-[16px] border border-white/10 bg-black/50 p-7 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <p className="text-[15px] font-semibold tracking-tight text-white">Builders choose Trove</p>
          <blockquote className="mt-4 text-[15px] leading-relaxed text-zinc-300">
            “We went from a rough idea to a live multi-page site in one afternoon.
            Publish to a real subdomain and keep refining in chat — it just works.”
          </blockquote>
          <div className="mt-5">
            <p className="text-[13.5px] font-medium text-white">Arayan K.</p>
            <p className="text-[12.5px] text-zinc-500">Founder · shipped on troveai.site</p>
          </div>
        </div>
      </div>
    </div>
  );
}
