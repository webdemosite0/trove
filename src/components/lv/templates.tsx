"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useBuild } from "./use-build";

type Kind = "Website" | "Document" | "Spreadsheet" | "Deck" | "Research";

/* ---------- miniature previews (pure CSS, scale with the card) ---------- */

const Site = ({ from, to, title, accent = "#FEF3C7" }: { from: string; to: string; title: string; accent?: string }) => (
  <div className="absolute inset-0 flex flex-col" style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}>
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-white/30" />)}
      <span className="ml-auto h-1.5 w-10 rounded-full bg-white/25" />
    </div>
    <div className="flex flex-1 flex-col justify-center px-[9%]">
      <p className="text-[clamp(13px,1.5vw,19px)] font-semibold leading-[1.05] tracking-tight" style={{ color: accent }}>{title}</p>
      <div className="mt-2 h-1 w-1/2 rounded-full bg-white/30" />
      <div className="mt-3 flex gap-1.5">
        <span className="h-3.5 w-14 rounded-full" style={{ background: accent }} />
        <span className="h-3.5 w-10 rounded-full border border-white/40" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1.5 px-[9%] pb-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-7 rounded-md bg-white/15" />)}
    </div>
  </div>
);

const Doc = ({ title, tint = "#F4F1EA" }: { title: string; tint?: string }) => (
  <div className="absolute inset-0 flex items-start justify-center pt-4" style={{ background: tint }}>
    <div className="w-[72%] rounded-md bg-white p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
      <p className="text-[clamp(10px,1.1vw,13px)] font-semibold leading-tight text-zinc-900">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded bg-zinc-100 p-1.5">
            <div className="h-1 w-1/2 rounded-full bg-zinc-300" />
            <div className="mt-1 h-2 w-3/4 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
      {[1, 0.9, 0.95, 0.6].map((w, i) => <div key={i} className="mt-1.5 h-1 rounded-full bg-zinc-200" style={{ width: `${w * 100}%` }} />)}
    </div>
  </div>
);

const Sheet = ({ flag = true }: { flag?: boolean }) => (
  <div className="absolute inset-0 bg-white">
    <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
      <span className="rounded bg-emerald-700 px-1 text-[8px] font-bold text-white">XLSX</span>
      <span className="font-mono text-[9px] text-zinc-400">=(C2-D2)/C2</span>
    </div>
    {[0, 1, 2, 3, 4, 5].map((r) => (
      <div key={r} className={cn("grid grid-cols-4 border-b border-zinc-100 px-2 py-[5px]", flag && r > 3 ? "bg-red-50" : r % 2 ? "bg-zinc-50/60" : "")}>
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className={cn("h-1.5 rounded-full", c === 3 ? (flag && r > 3 ? "ml-auto w-1/2 bg-red-400" : "ml-auto w-1/2 bg-zinc-700") : "w-3/4 bg-zinc-200")} />
        ))}
      </div>
    ))}
  </div>
);

const Deck = ({ from, to, title }: { from: string; to: string; title: string }) => (
  <div className="absolute inset-0 flex flex-col justify-between p-[7%] text-white" style={{ background: `linear-gradient(150deg, ${from}, ${to})` }}>
    <span className="h-1 w-12 rounded-full bg-white/40" />
    <div>
      <p className="max-w-[80%] text-[clamp(12px,1.35vw,17px)] font-semibold leading-[1.1]">{title}</p>
      <div className="mt-2.5 flex h-8 items-end gap-1">
        {[30, 45, 52, 70, 95].map((h, i) => <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 4 ? "#F97316" : "rgba(255,255,255,0.3)" }} />)}
      </div>
    </div>
  </div>
);

const Research = () => (
  <div className="absolute inset-0 bg-[#0f172a] p-3 text-white">
    <p className="text-[clamp(10px,1.1vw,13px)] font-semibold">AI productivity tools — top 5</p>
    {["Market size & growth", "Pricing compared", "Where each one wins"].map((t, i) => (
      <div key={t} className="mt-2 flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
        <span className="grid size-3.5 place-items-center rounded-full text-[7px] font-bold" style={{ background: ["#3B82F6", "#EC4899", "#F97316"][i] }}>{i + 1}</span>
        <span className="text-[9px] text-white/80">{t}</span>
      </div>
    ))}
    <p className="mt-2 text-[8px] text-white/45">12 sources · cited</p>
  </div>
);

const ITEMS: { title: string; kind: Kind; prompt: string; preview: React.ReactNode }[] = [
  { title: "Coffee roastery launch site", kind: "Website", prompt: "Build a warm, premium landing page for my coffee roastery with a wholesale section", preview: <Site from="#5b3a1f" to="#1a120b" title="Coffee worth slowing down for." /> },
  { title: "Q3 investor update", kind: "Document", prompt: "Draft a one-page Q3 investor update: lead with the wins, be honest about margins", preview: <Doc title="Q3 was the quarter wholesale finally worked." /> },
  { title: "Wholesale pricing model", kind: "Spreadsheet", prompt: "Build a wholesale pricing model for three products in two sizes and flag anything under a 55% margin", preview: <Sheet /> },
  { title: "Seed pitch deck", kind: "Deck", prompt: "Create a 10-slide seed pitch deck with a clear narrative arc", preview: <Deck from="#111827" to="#1e3a8a" title="Wholesale is our fastest-growing channel." /> },
  { title: "Designer portfolio", kind: "Website", prompt: "Build a bold portfolio site for a freelance motion designer", preview: <Site from="#0a0a0a" to="#27272a" title="Motion, made simple." accent="#ffffff" /> },
  { title: "Competitive research brief", kind: "Research", prompt: "Research the competitive landscape for AI productivity tools and summarize the top 5 players", preview: <Research /> },
  { title: "12-month budget", kind: "Spreadsheet", prompt: "Build a 12-month budget model with revenue, costs, and runway", preview: <Sheet flag={false} /> },
  { title: "Brand guide", kind: "Deck", prompt: "Design a brand identity guide with colors, typography, and logo usage", preview: <Deck from="#be185d" to="#f97316" title="A brand that feels warm and certain." /> },
  { title: "Client proposal", kind: "Document", prompt: "Write a client proposal for a website redesign with scope, timeline and pricing", preview: <Doc title="Website redesign proposal for Northwind" tint="#EEF2FF" /> },
];

const TABS: ("All" | Kind)[] = ["All", "Website", "Document", "Spreadsheet", "Deck", "Research"];

export function LvTemplates() {
  const build = useBuild();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const shown = ITEMS.filter((i) => tab === "All" || i.kind === tab);

  return (
    <section id="templates" className="mx-auto max-w-[1240px] scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.035em] text-ink">Start from a template</h2>
          <p className="mt-2 text-[16px] text-ink-3">Real files made in Trove. Pick one and make it yours in a sentence.</p>
        </div>
        <Link href="/templates" className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 hover:text-ink">
          View all <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <div role="tablist" aria-label="Template type" className="mt-7 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-[13.5px] font-medium transition-colors",
              tab === t ? "bg-ink text-canvas" : "border border-line text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            {t === "All" ? "Discover" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => (
          <button key={item.title} type="button" onClick={() => build(item.prompt)} className="group text-left">
            <div className="lv-thumb transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.55)]">
              {item.preview}
              <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-black/75 py-2 text-[12.5px] font-semibold text-white opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100">
                Use this template <FiArrowRight size={13} aria-hidden />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="truncate text-[14.5px] font-medium text-ink">{item.title}</p>
              <span className="shrink-0 rounded-full bg-sunk px-2.5 py-0.5 text-[11.5px] font-medium text-ink-3">{item.kind}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
