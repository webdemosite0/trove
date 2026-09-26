"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

const OUTPUTS = [
  { label: "Websites", detail: "live preview · publish" },
  { label: "Documents", detail: "edit · export" },
  { label: "Spreadsheets", detail: "tables · Excel" },
  { label: "Decks", detail: "slides · PPTX" },
  { label: "Code", detail: "projects" },
  { label: "Agents", detail: "saved specialists" },
];

export function TrustedBar() {
  return (
    <section className="border-y border-zinc-200/80 bg-white/40 px-5 py-14 backdrop-blur-sm">
      <Reveal>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          One workspace for the work you ship
        </p>
      </Reveal>
      <div className="mx-auto mt-8 flex max-w-[960px] flex-wrap items-center justify-center gap-3">
        {OUTPUTS.map((o, i) => (
          <Reveal key={o.label} delay={i * 40} as="div">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-medium text-zinc-700 shadow-sm">
              <span className="text-zinc-900">{o.label}</span>
              <span className="text-[12px] font-normal text-zinc-500">{o.detail}</span>
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return null;
}

/** Animated product demo — chat drives a live website build. */
export function ProductMockup() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % 6), 2400);
    return () => window.clearTimeout(t);
  }, [phase]);
  const published = phase >= 5;
  return (
    <section className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1120px]">
        <Reveal className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
            Live workspace
          </p>
          <h2 className="mx-auto mt-3 max-w-[28ch] text-[clamp(1.85rem,1.2rem+1.9vw,2.7rem)] font-semibold tracking-[-0.03em] text-zinc-900">
            Build by chatting — preview updates as you go
          </h2>
          <p className="mx-auto mt-3 max-w-[50ch] text-[15.5px] text-zinc-600">
            Conversation on the left. Live preview on the right. Ask for changes and watch the site update in the same project.
          </p>
        </Reveal>
        <Reveal delay={100} y={40} className="mt-12">
          <div
            aria-label="Demonstration of Trove building a website from chat"
            className="relative overflow-hidden rounded-[24px] border border-zinc-200/90 bg-white shadow-[0_40px_100px_-40px_rgba(79,70,229,0.35)]"
          >
            <div className="flex h-12 items-center border-b border-zinc-200/80 bg-white px-4">
              <span className="text-[13px] font-semibold text-zinc-800">CliniLamp website</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-3 py-1.5 text-[10.5px] font-semibold text-white",
                  published ? "bg-emerald-600" : "bg-gradient-to-r from-violet-600 to-indigo-600",
                )}
              >
                {published ? "Published ✓" : "Publish"}
              </span>
            </div>
            <div className="grid min-h-[360px] lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="border-b border-zinc-200/80 bg-[#fbfbfc] p-4 lg:border-b-0 lg:border-r">
                <div className="ml-auto max-w-[91%] rounded-2xl rounded-tr-md bg-zinc-900 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white">
                  Build a premium product site for CliniLamp with a modern healthcare feel.
                </div>
                {phase >= 1 ? (
                  <div className="mt-3 max-w-[94%] rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-[12.5px] text-zinc-700">
                    {phase === 1 ? "Building your site…" : "Your first version is ready. Keep refining in chat."}
                  </div>
                ) : null}
              </div>
              <div className="min-h-[280px] bg-[#f5f5f7] p-5">
                <div className="h-full rounded-[20px] border border-zinc-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                    Healthcare lighting
                  </p>
                  <h3 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-zinc-950">
                    Light that follows care
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-[12px] text-zinc-500">
                    Clinical-grade lighting designed for modern wards and calmer rooms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HubDiagram() {
  return null;
}

const GALLERY = [
  { title: "Nova", label: "SaaS", tone: "from-violet-500 to-indigo-600", light: false },
  { title: "Atelier", label: "Portfolio", tone: "from-zinc-100 to-zinc-200", light: true },
  { title: "Harbor", label: "Commerce", tone: "from-emerald-500 to-teal-600", light: false },
  { title: "Pulse", label: "Health", tone: "from-rose-500 to-pink-600", light: false },
];

export function WhyGallery() {
  return (
    <section className="overflow-hidden px-5 py-20 lg:py-28">
      <Reveal className="mx-auto max-w-[720px] text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">Why Trove</p>
        <h2 className="mt-3 text-[clamp(1.9rem,1.2rem+2vw,3rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900">
          The hard part was never the blank page
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-relaxed text-zinc-600">
          It is the launch due tomorrow, the portfolio still in a Doc, and the landing page you
          promised last week. Trove takes each one from chat to a working result in the same project.
        </p>
        <Link
          href="/websites"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-[13.5px] font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Explore websites →
        </Link>
      </Reveal>
      <div className="mx-auto mt-14 flex max-w-[1000px] flex-wrap justify-center gap-4">
        {GALLERY.map((g) => (
          <div
            key={g.title}
            className={cn(
              "flex h-[180px] w-[220px] flex-col justify-end rounded-[22px] border border-zinc-200/50 bg-gradient-to-br p-6 shadow-md",
              g.tone,
            )}
          >
            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", g.light ? "text-zinc-500" : "text-white/50")}>
              {g.label}
            </p>
            <p className={cn("mt-1 text-[22px] font-semibold tracking-tight", g.light ? "text-zinc-900" : "text-white")}>
              {g.title}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
