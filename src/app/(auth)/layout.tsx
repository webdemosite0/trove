import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";
import { AuthIllustration } from "@/components/auth/auth-illustration";

/**
 * Split auth layout matching product photo:
 * left form panel, right soft-lavender illustration scene.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ececf1] p-4 sm:p-6">
      <div className="flex w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
        {/* Left — form */}
        <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-12 lg:w-[46%] lg:px-14">
          <Link href="/" className="mb-8 inline-flex w-fit">
            <BrandLockup orbSize={34} wordSize={22} sweep={false} />
          </Link>
          <div className="w-full max-w-[360px]">{children}</div>
        </div>

        {/* Right — illustration */}
        <div className="relative hidden min-h-[640px] overflow-hidden lg:flex lg:w-[54%]">
          <AuthIllustration />
        </div>
      </div>
    </div>
  );
}
