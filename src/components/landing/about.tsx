import Link from "next/link";
import { site } from "@/lib/site";
import { SectionHead } from "@/components/landing/sections";

/**
 * Who is behind the product.
 *
 * A landing page without a human reads as a wrapper. This is short, true,
 * and points at an inbox that actually answers.
 */
export function About() {
  return (
    <section id="about" className="border-y border-line bg-rail/40">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHead
            center={false}
            eyebrow="About"
            title="A small studio, building the workspace we wanted."
            lede="Trove exists because chat is a terrible place to leave finished work. We make files you can keep, agents you can reopen, and a free plan that is the whole product."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--r-panel)] border border-line bg-canvas p-5 shadow-[var(--sh-1)]">
              <p className="text-[13px] font-medium text-ink">What we ship</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
                One workspace for websites, documents, spreadsheets, code,
                research and agents — generated as real files, not a copy
                button.
              </p>
            </div>
            <div className="rounded-[var(--r-panel)] border border-line bg-canvas p-5 shadow-[var(--sh-1)]">
              <p className="text-[13px] font-medium text-ink">How to reach us</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
                Questions, bugs, or a job you want Trove to handle — write to{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="text-accent hover:underline"
                >
                  {site.email}
                </a>
                .
              </p>
              <Link
                href="/about"
                className="mt-3 inline-block text-[13px] font-medium text-ink-2 hover:text-ink"
              >
                Read the full story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
