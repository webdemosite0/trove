"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "@/components/ui/icons";
import type { FeatureExample as Example } from "@/lib/features";
import {
  DECK,
  MEMO,
  RESEARCH,
  SHEET,
  SITE_HTML,
} from "./demo-outputs";

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_24px_60px_-28px_rgba(15,23,42,0.25)]">
      <div className="flex h-10 items-center gap-2 border-b border-line bg-rail/60 px-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-zinc-300" />
          <span className="size-2.5 rounded-full bg-zinc-300" />
          <span className="size-2.5 rounded-full bg-zinc-300" />
        </span>
        <span className="truncate font-mono text-[11.5px] text-ink-3">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SiteExample() {
  return (
    <Frame title="ember-and-oak.html">
      <iframe
        title="Ember & Oak — example website"
        srcDoc={SITE_HTML}
        sandbox="allow-same-origin"
        className="h-[420px] w-full border-0 bg-white sm:h-[480px]"
        loading="lazy"
      />
    </Frame>
  );
}

function DocExample() {
  return (
    <Frame title="q3-investor-update.md">
      <div className="max-h-[480px] overflow-y-auto bg-[#f4f1ea] p-4 sm:p-6">
        <article className="mx-auto max-w-[560px] bg-white px-6 py-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:px-10">
          <p
            className="text-[24px] leading-tight text-zinc-900"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {MEMO.title}
          </p>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-400">{MEMO.meta}</p>
          <hr className="my-5 border-zinc-200" />
          {MEMO.sections.map((s, i) => (
            <div key={i} className="mb-5">
              {s.heading && (
                <p className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-zinc-800">
                  {s.heading}
                </p>
              )}
              {s.body && <p className="text-[13.5px] leading-relaxed text-zinc-700">{s.body}</p>}
              {s.quote && (
                <blockquote className="border-l-2 border-amber-500/70 pl-3 text-[13.5px] italic text-zinc-600">
                  {s.quote}
                </blockquote>
              )}
              {s.bullets && (
                <ul className="list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-zinc-700">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </article>
      </div>
    </Frame>
  );
}

function SheetExample() {
  return (
    <Frame title="wholesale-pricing.csv">
      <div className="overflow-x-auto p-3 sm:p-4">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="w-8 border border-zinc-200 bg-zinc-50" />
              {SHEET.head.map((h, i) => (
                <th
                  key={i}
                  className="border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-left font-semibold text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHEET.rows.map((row, i) => (
              <tr key={i} className={row.total ? "bg-zinc-50 font-semibold" : row.flag ? "bg-red-50/60" : ""}>
                <td className="border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-[11px] text-zinc-400">
                  {i + 1}
                </td>
                {row.cells.map((c, j) => (
                  <td
                    key={j}
                    className={`border border-zinc-200 px-2.5 py-1.5 ${
                      j === 4 && row.flag ? "font-semibold text-red-600" : "text-zinc-600"
                    } ${typeof c === "number" ? "font-mono" : ""}`}
                  >
                    {j === 2 || j === 3 ? (typeof c === "number" ? `$${c.toFixed(2)}` : c) : c}
                    {j === 4 && row.flag && (
                      <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        below 55%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

function DeckExample() {
  const [idx, setIdx] = useState(0);
  const slide = DECK[idx];
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-zinc-900 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex min-h-[300px] flex-col justify-between p-7 sm:min-h-[340px] sm:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/90">
              {slide.kicker}
            </p>
            <p
              className="mt-3 max-w-[16ch] text-[clamp(1.6rem,1.2rem+2vw,2.4rem)] leading-[1.1] text-white"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {slide.title}
            </p>
            <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-zinc-300">{slide.body}</p>
            {slide.points && (
              <ul className="mt-4 space-y-1.5">
                {slide.points.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13.5px] text-zinc-200">
                    <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-500">
              {String(idx + 1).padStart(2, "0")} / {String(DECK.length).padStart(2, "0")}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIdx((idx - 1 + DECK.length) % DECK.length)}
                className="grid size-8 place-items-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                aria-label="Previous slide"
              >
                <FiChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIdx((idx + 1) % DECK.length)}
                className="grid size-8 place-items-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                aria-label="Next slide"
              >
                <FiChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchExample() {
  return (
    <Frame title="market-scan.md">
      <div className="max-h-[480px] overflow-y-auto bg-white p-5 sm:p-7">
        <p
          className="text-[22px] leading-tight text-zinc-900"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {RESEARCH.title}
        </p>
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-400">{RESEARCH.meta}</p>
        <div className="mt-5 space-y-5">
          {RESEARCH.findings.map((f, i) => (
            <div key={i} className="rounded-xl border border-line bg-rail/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal-700">
                Finding {i + 1}
              </p>
              <p className="mt-1 text-[14.5px] font-semibold text-zinc-900">{f.heading}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">{f.body}</p>
              <p className="mt-2 border-t border-line pt-2 text-[11.5px] text-zinc-400">
                <span className="font-semibold text-zinc-500">Sources: </span>
                {f.source}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function CrewExample() {
  return (
    <Frame title="the-tros.png">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/api/crew/image"
        alt="The ten Tros mascots — Trove's AI specialist crew"
        className="h-auto w-full bg-gradient-to-b from-violet-50 to-white"
        loading="lazy"
      />
    </Frame>
  );
}

const INTEGRATION_APPS: { name: string; tone: string }[] = [
  { name: "Gmail", tone: "#ea4335" },
  { name: "Drive", tone: "#0f9d58" },
  { name: "Slack", tone: "#611f69" },
  { name: "GitHub", tone: "#24292f" },
  { name: "Notion", tone: "#000000" },
  { name: "Linear", tone: "#5e6ad2" },
  { name: "Figma", tone: "#a259ff" },
  { name: "Stripe", tone: "#635bff" },
  { name: "HubSpot", tone: "#ff7a59" },
  { name: "Calendar", tone: "#4285f4" },
  { name: "Dropbox", tone: "#0061ff" },
  { name: "Zendesk", tone: "#03363d" },
];

function IntegrationsExample() {
  return (
    <Frame title="connected-apps">
      <div className="bg-white p-5 sm:p-7">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {INTEGRATION_APPS.map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-raised/60 p-3"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white"
                style={{ background: a.tone }}
                aria-hidden
              >
                {a.name.slice(0, 1)}
              </span>
              <span className="truncate text-[12.5px] font-medium text-ink">{a.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[12.5px] text-ink-4">
          + 4,000 more — connected over OAuth, revoked in one click.
        </p>
      </div>
    </Frame>
  );
}

export function FeatureExample({ example }: { example: Example }) {
  return (
    <figure className="mt-10">
      {example.kind === "site" && <SiteExample />}
      {example.kind === "doc" && <DocExample />}
      {example.kind === "sheet" && <SheetExample />}
      {example.kind === "deck" && <DeckExample />}
      {example.kind === "research" && <ResearchExample />}
      {example.kind === "crew" && <CrewExample />}
      {example.kind === "integrations" && <IntegrationsExample />}
      <figcaption className="mx-auto mt-4 max-w-[62ch] text-center">
        <p className="text-[13px] font-medium text-ink-2">{example.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-4">{example.caption}</p>
      </figcaption>
    </figure>
  );
}
