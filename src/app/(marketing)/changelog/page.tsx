import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Changelog — what shipped lately",
  description: "Recent launches and improvements to Trove.",
  alternates: { canonical: "/changelog" },
};

const ENTRIES: { date: string; title: string; body: string; link?: string; linkLabel?: string }[] = [
  {
    date: "October 2026",
    title: "Launch-ready marketing site",
    body: "Rebuilt the public site around proof, not promises: a live build demo on the homepage, public feature pages with real examples, a templates gallery, keyword SEO pages, and a full navigation with product and resources menus.",
    link: "/templates",
    linkLabel: "Browse templates",
  },
  {
    date: "October 2026",
    title: "Tros — AI specialists",
    body: "Hire ten specialists with real jobs: Atlas, Scout, Milo, Nova, Leo, Iris, Zara, Kael, Luna, and Echo. Each Tro plans its work, asks approval before judgment calls, uses your connected apps, and saves real artifacts to its library.",
    link: "/features/tros",
    linkLabel: "Meet the Tros",
  },
  {
    date: "October 2026",
    title: "Real artifacts, saved automatically",
    body: "When a Tro produces a document, spreadsheet, deck, note, or code, it's saved as a real file — view, edit, download, or delete it from the Tro's library. No more copy-pasting out of chat.",
    link: "/features/agents",
    linkLabel: "How agents work",
  },
  {
    date: "September 2026",
    title: "4,000+ integrations",
    body: "Connect Gmail, Drive, Slack, GitHub, Notion, and thousands more over OAuth. Agents read your data automatically; actions need your approval.",
    link: "/features/integrations",
    linkLabel: "See integrations",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 pb-24 pt-14 sm:px-5 lg:pt-20">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
          Changelog
        </p>
        <h1 className="mt-2.5 text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          What shipped lately.
        </h1>
        <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">
          The short version of what's new in Trove. No version numbers, no filler.
        </p>
      </header>

      <div className="mt-10 space-y-8">
        {ENTRIES.map((e) => (
          <article key={e.title} className="relative border-l-2 border-line pl-6">
            <span aria-hidden className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-violet-500" />
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-4">{e.date}</p>
            <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-ink">{e.title}</h2>
            <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-3">{e.body}</p>
            {e.link && (
              <Link
                href={e.link}
                className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-medium text-accent hover:underline"
              >
                {e.linkLabel} <FiArrowRight size={13} aria-hidden />
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
