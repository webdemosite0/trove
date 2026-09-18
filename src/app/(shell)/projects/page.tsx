import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { SignedOut } from "@/components/settings/signed-out";
import { AllWorkSection } from "@/components/work/all-work-section";

export const metadata = { title: "All work" };

export default async function ProjectsPage() {
  const user = await currentUser();
  if (!user) return <SignedOut />;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-[22px] border border-black/[0.055] bg-white/75 p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,.35)] backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Library
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-ink">
              All work
            </h1>
            <p className="mt-1.5 max-w-[620px] text-[14px] leading-6 text-ink-3">
              Every saved website, chat, document, spreadsheet, deck, research task,
              design and agent in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="rounded-full border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink"
            >
              New chat
            </Link>
            <Link
              href="/websites"
              className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              New website
            </Link>
          </div>
        </div>
      </div>

      <AllWorkSection limit={120} showViewAll={false} className="pt-7" />
    </div>
  );
}
