import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { SectionHead } from "@/components/landing/sections";
import { cn } from "@/lib/utils";

/**
 * Work you can actually try, not quotes from people who do not exist.
 *
 * Each card is a real prompt that lands in /chat. The visitor can press
 * "Try this" and see the same pipeline the marketing copy describes.
 */
const SAMPLES = [
  {
    kind: "Website",
    prompt: "Build a landing page for a specialty coffee roastery with tasting notes and a shop.",
    href: "/websites",
    result: "Responsive site as a ZIP",
  },
  {
    kind: "Document",
    prompt: "Write a six-week design retainer proposal with scope, timeline and fees.",
    href: "/documents",
    result: "Word .docx you can open",
  },
  {
    kind: "Spreadsheet",
    prompt: "Build a Q2 financial model with revenue, burn and three hiring scenarios.",
    href: "/spreadsheets",
    result: "Excel workbook, charts included",
  },
  {
    kind: "Agent",
    prompt: "Create an agent that answers questions about our pricing using the public FAQ.",
    href: "/agents",
    result: "Saved agent with its own chat",
  },
];

export function Studio() {
  return (
    <section id="studio" className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead
        eyebrow="Try it"
        title="Open a prompt. Keep the file."
        lede="These are real jobs Trove is built to finish. Pick one, or type your own on the homepage."
      />

      <ul className="nx-stagger mt-12 grid gap-4 sm:grid-cols-2">
        {SAMPLES.map((s) => (
          <li key={s.kind}>
            <article
              className={cn(
                "flex h-full flex-col rounded-[var(--r-panel)] border border-line bg-canvas p-5",
                "shadow-[var(--sh-1)] transition-[transform,box-shadow] duration-[var(--t-hover)]",
                "hover:-translate-y-[2px] hover:shadow-[var(--sh-2)]",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                {s.kind}
              </p>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-2">
                {s.prompt}
              </p>
              <p className="mt-4 text-[12.5px] text-ink-4">{s.result}</p>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/chat?q=${encodeURIComponent(s.prompt)}`}
                  className="btn-grad inline-flex h-10 items-center rounded-[var(--r-control)] px-4 text-[13.5px] font-medium"
                >
                  Try this
                </Link>
                <Link
                  href={s.href}
                  className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-3 hover:text-ink"
                >
                  How it works
                  <FiArrowRight
                    size={13}
                    className="transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
