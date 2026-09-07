import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Trove is an AI workspace that turns a sentence into finished files you can download and keep. Built as a small studio product, not a chat wrapper.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    title: `About · ${site.name}`,
    description:
      "Why Trove exists: finished work should leave as a file, not vanish into a chat.",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
        About Trove
      </p>
      <h1 className="mt-3 text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
        Finished work should leave as a file.
      </h1>
      <div className="mt-8 space-y-5 text-[16.5px] leading-relaxed text-ink-2">
        <p>
          Most AI products are a box you type into. You get an answer, you copy
          it somewhere else, and the thread is gone. Trove is the other way
          round: you describe the job once, it plans the tools, and you download
          a website, a Word document, a spreadsheet, a deck, or an agent you can
          open again tomorrow.
        </p>
        <p>
          We are a small studio. There is no enterprise sales team and no
          invented customer wall. The free plan is the whole product — 200
          credits a month, every tool, no card. Paid plans add capacity, not
          features.
        </p>
        <p>
          If something is broken, missing, or a job you wish it could do, write
          to{" "}
          <a href={`mailto:${site.email}`} className="text-accent hover:underline">
            {site.email}
          </a>
          . A person reads that inbox.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/chat"
          className="btn-grad inline-flex h-11 items-center gap-2 rounded-[var(--r-control)] px-5 text-[14px] font-medium"
        >
          Start building
          <FiArrowRight size={15} />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-11 items-center rounded-[var(--r-control)] border border-line-strong px-5 text-[14px] font-medium text-ink hover:bg-hover"
        >
          See pricing
        </Link>
      </div>
    </div>
  );
}
