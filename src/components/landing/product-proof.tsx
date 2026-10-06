"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiDownload,
  FiFileText,
  FiGrid,
} from "@/components/ui/icons";
import {
  MEMO,
  SHEET,
  memoMarkdown,
  sheetCsv,
} from "./demo-outputs";

/**
 * Product proof: one realistic brief (before) next to the three real files
 * Trove produced from it (after). The artifacts are the genuine demo outputs
 * in demo-outputs.ts — rendered live and downloadable, not screenshots.
 *
 * Honesty rule: this is an illustrative product demo, labeled as such.
 * No customer names, logos, or testimonials are invented anywhere here.
 */

const BRIEF = `We're Ember & Oak — small-batch roastery in Portland. Wholesale push starts Monday and I need three things:

1. A launch site. Warm, premium. Our three house roasts, subscription CTA.
2. A one-page Q3 investor update. Lead with the wholesale win, be honest about margins.
3. A wholesale pricing model — three roasts at 12oz and 5lb. Flag anything under 55% margin.

Go.`;

type TabId = "memo" | "sheet";

const TABS: {
  id: TabId;
  label: string;
  file: string;
  mime: string;
  getContent: () => string;
  Icon: typeof FiFileText;
}[] = [
  { id: "memo", label: "Investor memo", file: "q3-investor-update.md", mime: "text/markdown", getContent: memoMarkdown, Icon: FiFileText },
  { id: "sheet", label: "Pricing model", file: "wholesale-pricing.csv", mime: "text/csv", getContent: sheetCsv, Icon: FiGrid },
];

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function MemoView() {
  return (
    <div className="h-full overflow-y-auto bg-[#f4f1ea] p-4 sm:p-6">
      <article className="mx-auto max-w-[560px] bg-white px-6 py-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:px-10 sm:py-9">
        <h3
          className="text-[24px] leading-tight text-zinc-900"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {MEMO.title}
        </h3>
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-400">{MEMO.meta}</p>
        <hr className="my-4 border-zinc-200" />
        {MEMO.sections.map((s, i) => (
          <div key={i} className="mb-4 last:mb-0">
            {s.heading && (
              <h4 className="mb-1 text-[12px] font-bold uppercase tracking-[0.06em] text-zinc-700">
                {s.heading}
              </h4>
            )}
            {s.body && <p className="text-[13px] leading-relaxed text-zinc-700">{s.body}</p>}
            {s.quote && (
              <blockquote className="border-l-2 border-amber-500/70 pl-3 text-[13px] italic text-zinc-600">
                {s.quote}
              </blockquote>
            )}
            {s.bullets && (
              <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-700">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </article>
    </div>
  );
}

function SheetView() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
        <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-600">
          fx
        </span>
        <span className="truncate font-mono text-[11px] text-zinc-600">{SHEET.formula}</span>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="w-8 border border-zinc-200 bg-zinc-50" />
              {SHEET.head.map((h, i) => (
                <th
                  key={i}
                  className="border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left font-semibold text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHEET.rows.map((row, i) => (
              <tr
                key={i}
                className={row.total ? "bg-zinc-50 font-semibold" : row.flag ? "bg-red-50/60" : ""}
              >
                <td className="border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-[10px] text-zinc-400">
                  {i + 1}
                </td>
                {row.cells.map((c, j) => (
                  <td
                    key={j}
                    className={`border border-zinc-200 px-2 py-1.5 ${
                      j === 4 && row.flag
                        ? "font-semibold text-red-600"
                        : j === 4
                          ? "text-zinc-700"
                          : "text-zinc-600"
                    } ${typeof c === "number" ? "font-mono" : ""}`}
                  >
                    {j === 2 || j === 3 ? (typeof c === "number" ? `$${c.toFixed(2)}` : c) : c}
                    {j === 4 && row.flag && (
                      <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                        below 55%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2.5 text-[11.5px] text-zinc-500">
          Margin floor is 55% — the two 5&nbsp;lb bags are flagged for repricing.
        </p>
      </div>
    </div>
  );
}

export function ProductProof() {
  const [tab, setTab] = useState<TabId>("memo");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <section className="relative px-4 py-14 sm:px-5 sm:py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,128,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
        }}
      />

      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[60ch] text-center">
          <p className="mb-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-4 sm:mb-3 sm:text-[11px]">
            Proof, not promises
          </p>
          <h2 className="text-[clamp(1.6rem,1.25rem+1.4vw,2.5rem)] font-semibold leading-[1.08] tracking-tight text-ink">
            One brief in. Three finished files out.
          </h2>
          <p className="mt-3 text-[13px] leading-6 text-ink-3 sm:mt-3.5 sm:text-[16px] sm:leading-relaxed">
            The actual brief and the actual files from a demo built in Trove — rendered live,
            downloadable, inspectable. An illustrative demo, not a customer story.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          {/* Before: the brief */}
          <div className="flex flex-col">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4 sm:text-[11px]">
              Before — the brief, sent as one message
            </p>
            <div className="flex-1 rounded-[18px] border border-line bg-raised p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-violet-500/15 text-[13px] font-bold text-violet-700 dark:text-violet-300">
                  M
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">Maya, founder</p>
                  <p className="text-[11px] text-ink-4">Ember &amp; Oak · fictional roastery</p>
                </div>
              </div>
              <p className="mt-3.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2 sm:text-[13.5px]">
                {BRIEF}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TABS.map((t) => {
                const Icon = t.Icon;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10.5px] text-ink-3"
                  >
                    <Icon size={11} aria-hidden />
                    {t.file}
                  </span>
                );
              })}
            </div>
          </div>

          {/* After: the finished files */}
          <div className="flex min-w-0 flex-col">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 sm:text-[11px]">
                After — the finished files
              </p>
              <button
                type="button"
                onClick={() => download(active.file, active.mime, active.getContent())}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-[11.5px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink"
              >
                <FiDownload size={12} aria-hidden className="shrink-0" />
                <span className="truncate">Download {active.file}</span>
              </button>
            </div>
            <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]">
              <div
                role="tablist"
                aria-label="Finished files"
                className="flex items-center gap-1 overflow-x-auto border-b border-line bg-sunk/60 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {TABS.map((t) => {
                  const Icon = t.Icon;
                  const on = t.id === tab;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={on}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                        on
                          ? "bg-raised text-ink shadow-sm ring-1 ring-line"
                          : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      <Icon size={13} aria-hidden />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div key={tab} className="h-[420px] sm:h-[520px]">
                {tab === "memo" && <MemoView />}
                {tab === "sheet" && <SheetView />}
              </div>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-4">
              Illustrative demo built in Trove. The site, memo, and model above are the real
              outputs — download them and check every byte.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center sm:mt-10">
          <Link
            href={"/signup?q=" + encodeURIComponent("Launch site for my business — warm, premium, with pricing and a contact CTA.")}
            className="btn-grad inline-flex h-12 items-center gap-2 rounded-full px-7 text-[14px] font-semibold"
          >
            Try it with your own brief <FiArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
