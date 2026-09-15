"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

const BRANDS = [
  "Google",
  "Amazon",
  "Netflix",
  "LinkedIn",
  "Salesforce",
  "Shopify",
  "Stripe",
  "NVIDIA",
];

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
    <section className="border-y border-zinc-200/80 bg-white/40 px-5 py-14 backdrop-blur-sm">
      <Reveal>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Built for teams shipping real products
        </p>
      </Reveal>
      <div className="mx-auto mt-8 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {BRANDS.map((b, i) => (
          <Reveal key={b} delay={i * 40} as="div">
            <span className="text-[15px] font-semibold tracking-tight text-zinc-400 transition hover:text-zinc-800">
              {b}
            </span>
          </Reveal>
        ))}
      </div>
      <Reveal delay={120}>
        <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Powered by models you already trust
        </p>
      </Reveal>
      <div className="mx-auto mt-5 flex max-w-[720px] flex-wrap items-center justify-center gap-2.5">
        {AI_MODELS.map((m, i) => (
          <Reveal key={m.name} delay={140 + i * 35} as="div">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 shadow-sm">
              <span className="size-2 rounded-full" style={{ background: m.color }} />
              {m.name}
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: "Create from scratch",
    body: "Start with a blank idea. Chat builds a full multi-page site with real structure, not a one-block template.",
    tone: "from-rose-500/15 to-rose-500/5 text-rose-600",
    icon: "1",
  },
  {
    title: "Add pages anytime",
    body: "Case studies, pricing, contact — extend the project without restarting. Layout stays consistent.",
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
    icon: "2",
  },
  {
    title: "Clone & remix",
    body: "Duplicate a layout you like, then reshape copy and sections with AI while design stays coherent.",
    tone: "from-amber-500/15 to-amber-500/5 text-amber-700",
    icon: "3",
  },
  {
    title: "Refine in chat",
    body: "Ask for darker themes, better mobile, or real forms — every reply updates the live preview.",
    tone: "from-violet-500/15 to-violet-500/5 text-violet-700",
    icon: "4",
  },
  {
    title: "Design guidance",
    body: "Color, type, and spacing recommendations aligned with modern product UI standards.",
    tone: "from-orange-500/15 to-orange-500/5 text-orange-700",
    icon: "5",
  },
  {
    title: "Ship in minutes",
    body: "Streaming build steps, sandbox preview, and one-click publish to your *.troveai.site subdomain.",
    tone: "from-teal-500/15 to-teal-500/5 text-teal-700",
    icon: "6",
  },
];

export function FeatureGrid() {
  return (
    <section id="capabilities" className="px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-[1040px]">
        <Reveal className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
            Capabilities
          </p>
          <h2 className="mt-3 text-[clamp(1.85rem,1.2rem+1.8vw,2.75rem)] font-semibold tracking-[-0.03em] text-zinc-900">
            Everything you need to finish
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-[16px] text-zinc-600">
            From first prompt to published subdomain — designed as a complete workflow, not a demo.
          </p>
        </Reveal>

        <div className="mt-12 overflow-hidden rounded-[28px] border border-zinc-200/90 bg-white/80 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 50}
                className={cn(
                  "border-zinc-100 p-7 transition hover:bg-violet-50/40",
                  i % 3 !== 2 && "lg:border-r",
                  i < 3 && "border-b",
                  i >= 3 && i % 3 !== 2 && "max-lg:border-b sm:border-b-0",
                  i === 3 || i === 4 ? "sm:border-b lg:border-b-0" : "",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-[15px] font-bold",
                    f.tone,
                  )}
                >
                  {f.icon}
                </span>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-zinc-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{f.body}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={80} className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-lg transition hover:bg-zinc-800"
          >
            Try AI Builder <span aria-hidden>→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** CSS product art — browser + chat workspace (no external image dependency). */
export function ProductMockup() {
  return (
    <section className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1120px]">
        <Reveal className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
            Live workspace
          </p>
          <h2 className="mx-auto mt-3 max-w-[28ch] text-[clamp(1.85rem,1.2rem+1.9vw,2.7rem)] font-semibold tracking-[-0.03em] text-zinc-900">
            Build by chatting with the AI website maker
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[15.5px] text-zinc-600">
            Preview on the left. Conversation on the right. Publish when it looks right.
          </p>
        </Reveal>

        <Reveal delay={100} y={40} className="mt-12">
          <div className="overflow-hidden rounded-[24px] border border-zinc-200/90 bg-white shadow-[0_40px_100px_-40px_rgba(79,70,229,0.35)]">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/90 px-4 py-3">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <div className="mx-auto flex h-8 max-w-[360px] flex-1 items-center justify-center rounded-full bg-white text-[12px] text-zinc-500 ring-1 ring-zinc-200">
                clinilamp.troveai.site
              </div>
            </div>
            <div className="grid min-h-[400px] lg:grid-cols-[1.15fr_320px]">
              <div className="relative border-b border-zinc-100 bg-gradient-to-br from-[#f4f2ff] via-white to-[#eef1ff] p-6 lg:border-b-0 lg:border-r">
                <div className="lp-float absolute right-8 top-8 hidden h-24 w-24 rounded-full bg-violet-400/20 blur-2xl sm:block" />
                <div className="relative flex h-full min-h-[320px] flex-col justify-center rounded-[20px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.2)] ring-1 ring-zinc-100">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[13px] font-bold text-white">
                      CL
                    </span>
                    <span className="text-[13px] font-semibold text-zinc-800">CliniLamp</span>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                    Healthcare · Product site
                  </p>
                  <h3 className="mt-2 text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-semibold tracking-tight text-zinc-900">
                    Light that follows care
                  </h3>
                  <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-zinc-600">
                    Clinical-grade lighting for modern wards — book a demo, explore specs, meet the team.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-900 px-4 py-2 text-[12.5px] font-medium text-white">
                      Get started
                    </span>
                    <span className="rounded-full border border-zinc-200 px-4 py-2 text-[12.5px] font-medium text-zinc-700">
                      View product
                    </span>
                  </div>
                  <div className="mt-10 grid grid-cols-3 gap-3">
                    {["Specs", "Hospitals", "Support"].map((x) => (
                      <div
                        key={x}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-center text-[11px] font-medium text-zinc-600"
                      >
                        {x}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col bg-zinc-50/50">
                <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3.5">
                  <span className="grid size-8 place-items-center rounded-full bg-violet-100 text-[12px] text-violet-700">
                    ✦
                  </span>
                  <span className="text-[13.5px] font-semibold text-zinc-800">AI Chat</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4 text-[13px]">
                  <div className="max-w-[95%] rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-700 shadow-sm">
                    I can add pages, refine design, or publish when you’re ready.
                  </div>
                  <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-zinc-900 px-3.5 py-2.5 text-white">
                    Add a pricing page and soft lavender hero
                  </div>
                  <div className="max-w-[95%] rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-700 shadow-sm">
                    Done — pricing is live in the preview. Want to publish to{" "}
                    <span className="font-medium text-violet-700">clinilamp.troveai.site</span>?
                  </div>
                </div>
                <div className="border-t border-zinc-100 p-3">
                  <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
                    <span className="flex-1 text-[12.5px] text-zinc-400">Ask AI anything…</span>
                    <span className="grid size-8 place-items-center rounded-full bg-violet-600 text-[12px] text-white">
                      ↑
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const INPUTS = [
  { label: "Prompt", sub: "Just describe it", color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Figma", sub: "Design links", color: "text-violet-600", bg: "bg-violet-50" },
  { label: "URL", sub: "Any public page", color: "text-sky-600", bg: "bg-sky-50" },
  { label: "Images", sub: "PNG · JPG · WebP", color: "text-amber-700", bg: "bg-amber-50" },
  { label: "Docs", sub: "PDF · DOCX", color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Code", sub: "Project files", color: "text-emerald-700", bg: "bg-emerald-50" },
];

const OUTPUTS = [
  { label: "Live site", sub: "*.troveai.site", color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "React / Vite", sub: "Download project", color: "text-cyan-700", bg: "bg-cyan-50" },
  { label: "HTML", sub: "Static export", color: "text-orange-700", bg: "bg-orange-50" },
  { label: "Preview", sub: "Sandbox + snapshot", color: "text-zinc-700", bg: "bg-zinc-100" },
  { label: "Versions", sub: "Republish safely", color: "text-zinc-800", bg: "bg-zinc-100" },
  { label: "Share link", sub: "Anyone with URL", color: "text-pink-600", bg: "bg-pink-50" },
];

export function HubDiagram() {
  return (
    <section className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="text-center">
          <h2 className="text-[clamp(1.75rem,1.1rem+1.7vw,2.5rem)] font-semibold tracking-[-0.03em] text-zinc-900">
            One workspace. Every source. Every output.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[15.5px] text-zinc-600">
            Drop a prompt, a brief, or a design link — Trove turns it into a site you can preview,
            download, and publish.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {INPUTS.map((x, i) => (
              <Reveal key={x.label} delay={i * 40}>
                <div
                  className={cn(
                    "rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    x.bg,
                  )}
                >
                  <p className={cn("text-[14px] font-semibold", x.color)}>{x.label}</p>
                  <p className="text-[12.5px] text-zinc-500">{x.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120} className="mx-auto">
            <div className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-[0_16px_50px_rgba(99,102,241,0.45)]">
              <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" style={{ animationDuration: "3s" }} />
              <div className="relative text-center">
                <p className="text-[13px] font-bold tracking-tight">Trove</p>
                <p className="text-[10px] opacity-80">AI hub</p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {OUTPUTS.map((x, i) => (
              <Reveal key={x.label} delay={80 + i * 40}>
                <div
                  className={cn(
                    "rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    x.bg,
                  )}
                >
                  <p className={cn("text-[14px] font-semibold", x.color)}>{x.label}</p>
                  <p className="text-[12.5px] text-zinc-500">{x.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const GALLERY = [
  { title: "Nocturne", tone: "from-zinc-900 via-zinc-800 to-zinc-900", label: "Editorial", light: false },
  { title: "Plugin OS", tone: "from-white via-zinc-50 to-violet-50", label: "SaaS", light: true },
  { title: "Atelier", tone: "from-stone-100 to-amber-50", label: "Studio", light: true },
  { title: "60K", tone: "from-zinc-950 to-indigo-950", label: "Metrics", light: false },
  { title: "Open Design", tone: "from-emerald-50 to-white", label: "Agency", light: true },
  { title: "Impact", tone: "from-indigo-950 via-violet-950 to-fuchsia-950", label: "Brand", light: false },
];

export function WhyGallery() {
  return (
    <section className="overflow-hidden px-5 py-20 lg:py-28">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes trove-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`,
        }}
      />
      <Reveal className="mx-auto max-w-[720px] text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">Why Trove</p>
        <h2 className="mt-3 text-[clamp(1.9rem,1.2rem+2vw,3rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900">
          The hard part was never the site
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-relaxed text-zinc-600">
          It is the launch due tomorrow, the portfolio still in a Doc, and the landing page you
          promised last week. Trove takes each one off your plate.
        </p>
        <Link
          href="/websites"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-[13.5px] font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Explore websites →
        </Link>
      </Reveal>

      <div className="relative mt-14">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#f4f2ff] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f4f2ff] to-transparent" />
        <div className="flex animate-[trove-marquee_42s_linear_infinite] gap-4 hover:[animation-play-state:paused]">
          {[...GALLERY, ...GALLERY].map((g, i) => (
            <div
              key={`${g.title}-${i}`}
              className={cn(
                "flex h-[220px] w-[300px] shrink-0 flex-col justify-end rounded-[22px] border border-zinc-200/50 bg-gradient-to-br p-6 shadow-md",
                g.tone,
              )}
            >
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  g.light ? "text-zinc-500" : "text-white/50",
                )}
              >
                {g.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-[22px] font-semibold tracking-tight",
                  g.light ? "text-zinc-900" : "text-white",
                )}
              >
                {g.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
