"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const BRANDS = ["Google", "Amazon", "Netflix", "LinkedIn", "Salesforce", "Shopify", "Stripe", "NVIDIA", "IBM", "SpaceX"];

const AI_MODELS = [
  { name: "GPT-4o", color: "#10a37f" },
  { name: "Claude", color: "#d97706" },
  { name: "Gemini", color: "#4285f4" },
  { name: "Grok", color: "#1d9bf0" },
  { name: "Llama", color: "#0668E1" },
  { name: "Mistral", color: "#ff7000" },
];

export function TrustedBar() {
  return (
    <section className="border-y border-line bg-rail/40 px-5 py-12">
      <p className="text-center text-[12px] font-medium uppercase tracking-[0.14em] text-ink-4">
        Trusted by teams building the next wave of products
      </p>
      <div className="mx-auto mt-8 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {BRANDS.map((b) => (
          <span key={b} className="text-[15px] font-semibold tracking-tight text-ink-3/80 transition hover:text-ink">
            {b}
          </span>
        ))}
      </div>
      <p className="mt-10 text-center text-[12px] font-medium uppercase tracking-[0.14em] text-ink-4">
        Powered by the models you already trust
      </p>
      <div className="mx-auto mt-5 flex max-w-[720px] flex-wrap items-center justify-center gap-3">
        {AI_MODELS.map((m) => (
          <span key={m.name} className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-ink-2 shadow-sm">
            <span className="size-2 rounded-full" style={{ background: m.color }} />
            {m.name}
          </span>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { title: "Create from Scratch", body: "Start with a blank idea and build a full multi-page site through natural chat with AI.", tone: "bg-rose-500/10 text-rose-500" },
  { title: "Add Pages Anytime", body: "Seamlessly add case studies, pricing, or contact pages without restarting the project.", tone: "bg-emerald-500/10 text-emerald-600" },
  { title: "Clone & Remix", body: "Duplicate an existing layout and customize with AI while keeping design consistency.", tone: "bg-amber-500/10 text-amber-600" },
  { title: "Refine with Chat", body: "Ask for darker themes, better mobile, or real forms — every reply updates the live site.", tone: "bg-rose-500/10 text-rose-500" },
  { title: "Design Assistance", body: "Get recommendations for color, type, and layout that match modern product standards.", tone: "bg-orange-500/10 text-orange-600" },
  { title: "Lightning Fast", body: "Generate professional multi-page sites in minutes, not days, with streaming build steps.", tone: "bg-teal-500/10 text-teal-600" },
];

export function FeatureGrid() {
  return (
    <section className="px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-[1000px]">
        <div className="overflow-hidden rounded-[24px] border border-line bg-raised shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={cn("border-line p-7 transition hover:bg-hover/40", i % 3 !== 2 && "lg:border-r", i < 3 && "border-b")}>
                <span className={cn("grid size-11 place-items-center rounded-[14px] text-[18px] font-semibold", f.tone)}>{i + 1}</span>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14.5px] font-medium text-white transition hover:opacity-90">
            Try AI Builder Now <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProductMockup() {
  return (
    <section className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <p className="text-center text-[13px] font-medium uppercase tracking-[0.12em] text-accent">Live workspace</p>
        <h2 className="mx-auto mt-3 max-w-[28ch] text-center text-[clamp(1.8rem,1.2rem+1.8vw,2.6rem)] font-semibold tracking-[-0.03em] text-ink">
          Build by chatting with the AI website maker
        </h2>
        <div className="nx-rise mt-12 overflow-hidden rounded-[20px] border border-line bg-raised shadow-[0_30px_90px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2 border-b border-line bg-sunk/50 px-4 py-2.5">
            <span className="size-[10px] rounded-full bg-[#ff5f57]" />
            <span className="size-[10px] rounded-full bg-[#febc2e]" />
            <span className="size-[10px] rounded-full bg-[#28c840]" />
            <div className="mx-auto flex h-7 max-w-[320px] flex-1 items-center justify-center rounded-full bg-raised text-[12px] text-ink-4">troveai.site/builder</div>
          </div>
          <div className="grid min-h-[380px] lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col border-b border-line bg-gradient-to-br from-[#f8f7f4] to-[#eee] p-6 dark:from-zinc-900 dark:to-zinc-950 lg:border-b-0 lg:border-r">
              <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-4">Strategic product site</p>
                <h3 className="mt-3 text-[28px] font-semibold tracking-tight text-ink">FlowDesk</h3>
                <p className="mt-1 text-[14px] text-ink-3">The AI-Powered Workforce Platform Built for Scale</p>
                <div className="mt-6 flex gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-[12px] text-white">Get started</span>
                  <span className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-2">View demo</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col bg-raised">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="grid size-7 place-items-center rounded-full bg-accent/15 text-accent text-[12px]">✦</span>
                <span className="text-[13.5px] font-medium text-ink">AI Chat</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 text-[13px]">
                <div className="rounded-[14px] border border-line bg-sunk/50 px-3 py-2 text-ink-2">Hi! I can add pages, edit content, or change the design.</div>
                <div className="ml-8 rounded-[14px] bg-ink px-3 py-2 text-white">Add a case study page with project outcomes</div>
                <div className="rounded-[14px] border border-line bg-sunk/50 px-3 py-2 text-ink-2">Done! I've added a Case Study section. Preview is live on the left.</div>
              </div>
              <div className="border-t border-line p-3">
                <div className="flex items-center gap-2 rounded-full border border-line bg-sunk/40 px-3 py-2">
                  <span className="flex-1 text-[12.5px] text-ink-4">Ask AI anything…</span>
                  <span className="grid size-7 place-items-center rounded-full bg-ink text-white text-[11px]">↑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const INPUTS = [
  { label: "Prompt", sub: "Just describe it", color: "text-rose-500" },
  { label: "Figma", sub: "Design links", color: "text-violet-500" },
  { label: "URL", sub: "Any public page", color: "text-sky-500" },
  { label: "Images", sub: "PNG · JPG · WebP", color: "text-amber-500" },
  { label: "Docs", sub: "PDF · DOCX", color: "text-blue-500" },
  { label: "Code", sub: "GitHub repos", color: "text-emerald-500" },
];

const OUTPUTS = [
  { label: "Live site", sub: "*.troveai.site", color: "text-indigo-500" },
  { label: "React / Vite", sub: "Download project", color: "text-cyan-500" },
  { label: "HTML", sub: "Static export", color: "text-orange-500" },
  { label: "GitHub", sub: "Push repo", color: "text-ink-2" },
  { label: "Vercel", sub: "One-click deploy", color: "text-ink" },
  { label: "Share link", sub: "Anyone with URL", color: "text-pink-500" },
];

export function HubDiagram() {
  return (
    <section className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="text-center text-[clamp(1.7rem,1.1rem+1.6vw,2.4rem)] font-semibold tracking-[-0.03em] text-ink">
          One workspace. Every source. Every output.
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-center text-[15px] text-ink-3">
          Drop a prompt, a Figma link, or a brief — Trove turns it into a production-ready site.
        </p>
        <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {INPUTS.map((x) => (
              <div key={x.label} className="rounded-[16px] border border-line bg-raised px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <p className={cn("text-[14px] font-semibold", x.color)}>{x.label}</p>
                <p className="text-[12.5px] text-ink-4">{x.sub}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-500 text-white shadow-[0_12px_40px_rgba(99,102,241,0.45)]">
            <div className="text-center">
              <p className="text-[11px] font-semibold">Trove</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {OUTPUTS.map((x) => (
              <div key={x.label} className="rounded-[16px] border border-line bg-raised px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <p className={cn("text-[14px] font-semibold", x.color)}>{x.label}</p>
                <p className="text-[12.5px] text-ink-4">{x.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const GALLERY = [
  { title: "Nocturne", tone: "from-zinc-900 to-zinc-800", label: "Editorial" },
  { title: "Plugin Ecosystem", tone: "from-white to-zinc-100", label: "SaaS", dark: false },
  { title: "Atelier", tone: "from-stone-100 to-stone-50", label: "Studio", dark: false },
  { title: "60K", tone: "from-zinc-950 to-zinc-900", label: "Metrics" },
  { title: "Open Design", tone: "from-emerald-50 to-white", label: "Agency", dark: false },
  { title: "Impact", tone: "from-indigo-950 to-indigo-900", label: "Brand" },
];

export function WhyGallery() {
  return (
    <section className="overflow-hidden px-5 py-20 lg:py-28">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes trove-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }` }} />
      <div className="mx-auto max-w-[720px] text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">Why Trove</p>
        <h2 className="mt-3 text-[clamp(1.9rem,1.2rem+2vw,3rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
          The hard part was never the site
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-relaxed text-ink-3">
          It is the launch due tomorrow, the portfolio that is still a Google Doc, and the landing page you promised last week. Trove takes each one off your plate.
        </p>
        <Link href="/websites" className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-5 py-2.5 text-[13.5px] font-medium text-accent transition hover:bg-accent/15">
          WEBSITES
        </Link>
      </div>
      <div className="relative mt-14">
        <div className="flex animate-[trove-marquee_40s_linear_infinite] gap-4 hover:[animation-play-state:paused]">
          {[...GALLERY, ...GALLERY].map((g, i) => (
            <div key={`${g.title}-${i}`} className={cn("flex h-[200px] w-[280px] shrink-0 flex-col justify-end rounded-[18px] border border-line bg-gradient-to-br p-5 shadow-sm", g.tone)}>
              <p className={cn("text-[11px] uppercase tracking-[0.12em]", g.dark === false ? "text-ink-4" : "text-white/50")}>{g.label}</p>
              <p className={cn("mt-1 text-[20px] font-semibold tracking-tight", g.dark === false ? "text-ink" : "text-white")}>{g.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
