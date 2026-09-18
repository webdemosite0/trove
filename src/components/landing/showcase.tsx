"use client";

import { useEffect, useState } from "react";
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

/** Animated product demo — chat drives a live website build, like the real builder. */
export function ProductMockup() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const durations = [2200, 2400, 2800, 2400, 3000, 2600];
    const timer = window.setTimeout(
      () => setPhase((value) => (value + 1) % durations.length),
      durations[phase] ?? 2600,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  const built = phase >= 2;
  const refining = phase >= 4;
  const published = phase >= 5;
  const cursor = [
    { left: "18%", top: "84%" },
    { left: "29%", top: "56%" },
    { left: "71%", top: "45%" },
    { left: "22%", top: "80%" },
    { left: "68%", top: "51%" },
    { left: "91%", top: "8%" },
  ][phase] ?? { left: "18%", top: "84%" };

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
          <p className="mx-auto mt-3 max-w-[50ch] text-[15.5px] text-zinc-600">
            Conversation on the left. Live preview on the right. Ask for changes and watch the site update.
          </p>
        </Reveal>

        <Reveal delay={100} y={40} className="mt-12">
          <div
            aria-label="Animated demonstration of Trove building and editing a website from chat"
            className="relative overflow-hidden rounded-[24px] border border-zinc-200/90 bg-white shadow-[0_40px_100px_-40px_rgba(79,70,229,0.35)]"
          >
            <div className="flex h-12 items-center border-b border-zinc-200/80 bg-white px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-zinc-950 text-[10px] font-bold text-white">
                  T
                </span>
                <span className="truncate text-[12.5px] font-semibold text-zinc-800 sm:text-[13px]">
                  CliniLamp website
                </span>
                <span className={cn(
                  "size-1.5 rounded-full transition-colors duration-500",
                  published ? "bg-emerald-500" : phase === 1 || phase === 4 ? "bg-amber-400" : "bg-violet-500",
                )} />
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10.5px] font-medium text-zinc-600 sm:inline-flex">
                  Preview
                </span>
                <span className={cn(
                  "rounded-full px-3 py-1.5 text-[10.5px] font-semibold text-white shadow-sm transition-all duration-500",
                  published
                    ? "bg-emerald-600"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600",
                )}>
                  {published ? "Published ✓" : "Publish"}
                </span>
              </div>
            </div>

            <div className="relative grid min-h-[430px] lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="flex min-h-[360px] flex-col border-b border-zinc-200/80 bg-[#fbfbfc] lg:border-b-0 lg:border-r">
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Trove AI
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-zinc-700">
                    Building with you
                  </p>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4 text-[12.5px]">
                  <div className="ml-auto max-w-[91%] rounded-2xl rounded-tr-md bg-zinc-900 px-3.5 py-2.5 leading-relaxed text-white shadow-sm">
                    Build a premium product site for CliniLamp with a modern healthcare feel.
                  </div>

                  {phase >= 1 ? (
                    <div className="lp-demo-message max-w-[94%] rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-3 text-zinc-700 shadow-sm">
                      {phase === 1 ? (
                        <>
                          <div className="flex items-center gap-2 font-medium text-zinc-800">
                            <span className="lp-demo-spinner size-3 rounded-full border-2 border-violet-200 border-t-violet-600" />
                            Building your site
                          </div>
                          <div className="mt-2.5 space-y-1.5 text-[11px] text-zinc-500">
                            <p className="lp-demo-step">✓ Creating page structure</p>
                            <p className="lp-demo-step" style={{ animationDelay: "160ms" }}>✓ Styling the hero</p>
                            <p className="lp-demo-step" style={{ animationDelay: "320ms" }}>• Preparing live preview</p>
                          </div>
                        </>
                      ) : (
                        <>Your first version is ready. You can keep refining it in chat.</>
                      )}
                    </div>
                  ) : null}

                  {phase >= 3 ? (
                    <div className="lp-demo-message ml-auto max-w-[91%] rounded-2xl rounded-tr-md bg-zinc-900 px-3.5 py-2.5 leading-relaxed text-white shadow-sm">
                      Add a pricing section and make the hero softer with lavender.
                    </div>
                  ) : null}

                  {phase >= 4 ? (
                    <div className="lp-demo-message max-w-[94%] rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-2.5 leading-relaxed text-zinc-700 shadow-sm">
                      {phase === 4 ? (
                        <span className="flex items-center gap-2">
                          <span className="lp-demo-spinner size-3 rounded-full border-2 border-violet-200 border-t-violet-600" />
                          Updating the live preview…
                        </span>
                      ) : (
                        <>Done — pricing is added and the new design is live.</>
                      )}
                    </div>
                  ) : null}

                  {published ? (
                    <div className="lp-demo-message max-w-[94%] rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-emerald-800">
                      Published to <span className="font-semibold">clinilamp.troveai.site</span>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-zinc-100 p-3">
                  <div className="flex min-h-10 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                    <span className="flex-1 text-[11.5px] text-zinc-400">
                      {phase < 3 ? "Ask Trove to change anything…" : "Send a follow-up…"}
                    </span>
                    <span className="grid size-7 place-items-center rounded-full bg-zinc-900 text-[12px] text-white">
                      ↑
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative min-h-[360px] overflow-hidden bg-[#f5f5f7] p-3 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] text-zinc-400">
                  <span>‹</span><span>›</span><span>↻</span>
                  <div className="mx-auto flex h-7 max-w-[290px] flex-1 items-center justify-center rounded-full bg-white px-3 text-[10.5px] text-zinc-500 ring-1 ring-zinc-200">
                    clinilamp.troveai.site
                  </div>
                  <span>↗</span>
                </div>

                {!built ? (
                  <div className="relative h-[330px] overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-7 shadow-sm">
                    <div className="lp-demo-skeleton h-6 w-24 rounded-lg bg-zinc-100" />
                    <div className="mt-14 max-w-[72%] space-y-3">
                      <div className="lp-demo-skeleton h-3 w-24 rounded-full bg-zinc-100" />
                      <div className="lp-demo-skeleton h-9 w-full rounded-xl bg-zinc-100" />
                      <div className="lp-demo-skeleton h-3 w-4/5 rounded-full bg-zinc-100" />
                      <div className="lp-demo-skeleton h-3 w-3/5 rounded-full bg-zinc-100" />
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "lp-demo-preview relative h-[330px] overflow-hidden rounded-[20px] border border-white/80 p-7 shadow-[0_20px_50px_-24px_rgba(15,23,42,.22)] ring-1 ring-zinc-100 transition-all duration-700",
                    refining
                      ? "bg-[radial-gradient(circle_at_85%_10%,rgba(167,139,250,.32),transparent_32%),linear-gradient(135deg,#faf7ff,#ffffff_58%,#f4f1ff)]"
                      : "bg-white",
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white">
                        CL
                      </span>
                      <span className="text-[12px] font-semibold text-zinc-800">CliniLamp</span>
                      <div className="ml-auto hidden gap-4 text-[9.5px] font-medium text-zinc-500 sm:flex">
                        <span>Product</span><span>Hospitals</span><span>About</span>
                      </div>
                    </div>

                    <div className="mt-10 max-w-[78%]">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                        Healthcare lighting
                      </p>
                      <h3 className="mt-2 text-[clamp(1.45rem,2.8vw,2.15rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-zinc-950">
                        Light that follows care
                      </h3>
                      <p className="mt-2 max-w-[38ch] text-[11px] leading-relaxed text-zinc-500 sm:text-[12px]">
                        Clinical-grade lighting designed for modern wards, calmer rooms, and better patient experiences.
                      </p>
                      <div className="mt-5 flex gap-2">
                        <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-[9.5px] font-semibold text-white">Book a demo</span>
                        <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-[9.5px] font-semibold text-zinc-600">View product</span>
                      </div>
                    </div>

                    {refining ? (
                      <div className="lp-demo-message absolute inset-x-7 bottom-5 grid grid-cols-3 gap-2">
                        {[
                          ["Starter", "$49"],
                          ["Hospital", "$129"],
                          ["Enterprise", "Custom"],
                        ].map(([name, price]) => (
                          <div key={name} className="rounded-xl border border-violet-100 bg-white/88 p-2.5 shadow-sm backdrop-blur">
                            <p className="text-[8.5px] font-semibold text-zinc-700">{name}</p>
                            <p className="mt-1 text-[10.5px] font-bold text-zinc-950">{price}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute inset-x-7 bottom-5 grid grid-cols-3 gap-2">
                        {["Specs", "Hospitals", "Support"].map((item) => (
                          <div key={item} className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-2 py-2 text-center text-[9px] font-medium text-zinc-500">
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    {published ? (
                      <div className="lp-demo-publish absolute right-5 top-5 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-[9.5px] font-semibold text-emerald-700 shadow-lg">
                        ● Live
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <span
                aria-hidden
                className="lp-demo-cursor pointer-events-none absolute z-20 block h-6 w-6 transition-[left,top,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ left: cursor.left, top: cursor.top }}
              >
                <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-md">
                  <path d="M4 2.8 18.7 13l-6.4 1.1 3.5 5.5-2.7 1.7-3.5-5.6-4.4 4.8L4 2.8Z" fill="#111827" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <div className="h-1 bg-zinc-100">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-[width] duration-700"
                style={{ width: `${((phase + 1) / 6) * 100}%` }}
              />
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
