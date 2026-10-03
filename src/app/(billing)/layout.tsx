import Link from "next/link";
import { Backdrop } from "@/components/shell/backdrop";
import { PlansBackLink } from "@/components/billing/plans-back-link";

/**
 * Billing / plans — full-page, no app sidebar.
 * Back control returns to Trove (or Tros when that was the origin).
 */
export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-canvas text-ink">
      <Backdrop />
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-hover"
              aria-label="Trove home"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-[13px] font-bold text-white shadow-sm shadow-violet-500/30">
                T
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-ink">Trove</span>
            </Link>
            <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
            <span className="hidden text-[13px] font-medium text-ink-3 sm:inline">Plans</span>
          </div>
          <PlansBackLink />
        </div>
      </header>
      <main className="relative flex-1">{children}</main>
    </div>
  );
}
