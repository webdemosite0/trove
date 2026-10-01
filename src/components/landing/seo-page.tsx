"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiChevronDown } from "@/components/ui/icons";
import { FeatureExample } from "@/components/landing/feature-example";
import type { SeoPage } from "@/lib/seo-pages";
import { cn } from "@/lib/utils";

export function SeoPageView({ page }: { page: SeoPage }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[920px] px-4 pb-24 pt-14 sm:px-5 lg:pt-20">
      {/* Hero */}
      <header className="max-w-[680px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
          Trove · {page.cta}
        </p>
        <h1 className="mt-2.5 text-[clamp(2rem,1.4rem+2.6vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          {page.h1}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2 sm:text-[17px]">
          {page.standfirst}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="btn-grad inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold"
          >
            {page.cta} — free
            <FiArrowRight size={15} aria-hidden />
          </Link>
          <Link
            href="/templates"
            className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 text-[14.5px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            Browse templates
          </Link>
        </div>
        <p className="mt-3 text-[12.5px] text-ink-4">200 free credits a month · No card required</p>
      </header>

      {/* Example */}
      <FeatureExample example={page.example} />

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">How it works</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {page.steps.map((s, i) => (
            <li key={s.heading} className="rounded-2xl border border-line bg-raised/60 p-5">
              <span className="grid size-8 place-items-center rounded-full bg-violet-500/12 text-[13px] font-bold text-violet-700">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.heading}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Comparison */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-line">
        <div className="grid sm:grid-cols-2">
          <div className="bg-sunk/60 p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">A chatbot</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{page.compare.chatbot}</p>
          </div>
          <div className="border-t border-line bg-violet-500/[0.06] p-5 sm:border-l sm:border-t-0 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700">Trove</p>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink">{page.compare.trove}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">Frequently asked</h2>
        <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-raised/40">
          {page.faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[14.5px] font-medium text-ink">{f.q}</span>
                  <FiChevronDown
                    size={16}
                    className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {open && (
                  <p className="px-5 pb-5 text-[14px] leading-relaxed text-ink-3">{f.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-[var(--r-hero)] border border-line bg-rail p-7 sm:p-10">
        <h2 className="max-w-[24ch] text-[clamp(1.4rem,1.1rem+1.4vw,2rem)] font-semibold tracking-tight text-ink">
          {page.h1}
        </h2>
        <p className="mt-3 flex items-start gap-2 text-[14.5px] text-ink-2">
          <FiCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
          Start free — 200 credits a month, no card, cancel nothing because there's nothing to cancel.
        </p>
        <div className="mt-6">
          <Link
            href="/signup"
            className="btn-grad inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold"
          >
            {page.cta} — free
            <FiArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
