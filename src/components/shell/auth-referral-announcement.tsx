"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiChevronRight, FiX } from "@/components/ui/icons";

export function AuthReferralAnnouncement() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const cleaned = useRef(false);
  const [open, setOpen] = useState(() => searchParams.get("welcome") === "referral");

  useEffect(() => {
    if (!open || cleaned.current) return;
    cleaned.current = true;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("welcome");
    const query = next.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [open, pathname, router, searchParams]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-16 z-50 flex justify-center lg:absolute lg:top-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-[620px] overflow-hidden rounded-[22px] p-[1px] shadow-[0_18px_60px_-22px_rgba(0,0,0,0.45)]"
        style={{
          background: "linear-gradient(135deg, #f472b6, #a78bfa, #38bdf8, #fbbf24)",
        }}
      >
        <div className="relative overflow-hidden rounded-[21px] bg-rail/95 px-4 py-4 backdrop-blur-xl dark:bg-black/75 sm:px-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-45 blur-3xl"
            style={{ background: "linear-gradient(135deg,#f472b6,#38bdf8)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 left-8 size-28 rounded-full opacity-30 blur-3xl"
            style={{ background: "linear-gradient(135deg,#a78bfa,#fbbf24)" }}
          />

          <div className="relative flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-500">
                Refer & earn
              </p>
              <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em] text-ink sm:text-[17px]">
                Share Trove · get credits
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3 sm:text-[13px]">
                Invite people to Trove, earn credits for signups, and unlock a $200 payout review after 100 qualified paid referrals.
              </p>

              <Link
                href="/settings/affiliates"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent transition hover:gap-1.5"
              >
                Open affiliates
                <FiChevronRight size={13} />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss referral announcement"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-canvas/80 text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              <FiX size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
