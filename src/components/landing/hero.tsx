"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiGlobe,
  FiLayout,
  FiCreditCard,
  FiCalendar,
  FiLayers,
  FiGrid,
  FiArrowRight,
} from "@/components/ui/icons";

const PROMPTS = [
  "Build a portfolio site for a freelance motion designer…",
  "Make a booking site for a specialty coffee roastery…",
  "Create a landing page for an AI SaaS startup…",
  "Design an online shop for handmade ceramics…",
  "Build a multi-page clinic site with appointments…",
];

const CHIPS: { label: string; icon: typeof FiGlobe; prompt: string }[] = [
  { label: "Portfolio", icon: FiLayout, prompt: "Build a premium portfolio website for a creative professional with case studies, about, and contact pages" },
  { label: "Landing page", icon: FiGlobe, prompt: "Create a high-converting SaaS landing page with hero, features, pricing, and FAQ" },
  { label: "Online shop", icon: FiCreditCard, prompt: "Design an elegant online shop homepage with product grid, cart preview, and brand story" },
  { label: "Booking site", icon: FiCalendar, prompt: "Build a booking website for a local clinic with services, doctors, and appointment CTA" },
  { label: "SaaS marketing", icon: FiLayers, prompt: "Create a modern SaaS marketing site with product screenshots, integrations, and pricing" },
  { label: "Agency site", icon: FiGrid, prompt: "Build a design agency website with work gallery, process, team, and contact" },
];

export function Hero({ freeCredits }: { freeCredits: number }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (value) return;
    const full = PROMPTS[promptIndex];
    const speed = deleting ? 22 : 38;
    const t = setTimeout(() => {
      if (!deleting) {
        if (charIndex < full.length) {
          setTyped(full.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1600);
        }
      } else if (charIndex > 0) {
        setTyped(full.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      } else {
        setDeleting(false);
        setPromptIndex((i) => (i + 1) % PROMPTS.length);
      }
    }, speed);
    return () => clearTimeout(t);
  }, [charIndex, deleting, promptIndex, value]);

  function go(text?: string) {
    const idea = (text ?? value).trim();
    if (!idea) {
      router.push("/websites");
      return;
    }
    router.push(`/websites?q=${encodeURIComponent(idea.slice(0, 2000))}`);
  }

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-5 sm:pb-16 sm:pt-16 lg:pb-24 lg:pt-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl opacity-70">
        <div className="absolute left-1/2 top-8 h-64 w-[min(90%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400/25 via-indigo-300/20 to-fuchsia-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[960px] text-center">
        <div className="lp-hero-in mb-5 inline-flex items-center rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur-md sm:mb-7 sm:px-4 sm:text-[11px]">
          AI THAT SHIP REAL FILES
        </div>

        <h1
          className="lp-hero-in text-[clamp(2.05rem,1.55rem+3vw,4.35rem)] font-semibold leading-[1.02] tracking-[-0.038em] text-zinc-950"
          style={{ animationDelay: "60ms" }}
        >
          Describe it once.
          <br />
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            Trove builds it.
          </span>
        </h1>

        <p
          className="lp-hero-in mx-auto mt-4 max-w-[50ch] text-[13.5px] leading-6 text-zinc-600 sm:mt-6 sm:text-[17px] sm:leading-relaxed lg:text-[18px]"
          style={{ animationDelay: "120ms" }}
        >
          Real deliverables you can refine, export, and keep — websites, documents, spreadsheets, presentations, and code in the same project.
        </p>

        <div className="lp-hero-in mx-auto mt-7 max-w-[740px] sm:mt-11" style={{ animationDelay: "180ms" }}>
          <div className="rounded-[22px] border border-white/80 bg-white/82 p-1.5 shadow-[0_24px_80px_-24px_rgba(99,102,241,0.35),0_0_0_1px_rgba(99,102,241,0.06)] backdrop-blur-xl sm:rounded-[28px] sm:p-2">
            <div className="relative flex min-h-[84px] flex-col rounded-[17px] bg-gradient-to-b from-zinc-50/90 to-white px-3.5 py-3 ring-1 ring-zinc-200/80 sm:min-h-[100px] sm:rounded-[22px] sm:px-4 sm:py-3.5">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    go();
                  }
                }}
                rows={2}
                className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-[15.5px]"
                placeholder=""
                aria-label="Describe what to build"
              />
              {!value && (
                <span className="pointer-events-none absolute left-3.5 top-3 max-w-[calc(100%-4.6rem)] text-left text-[13.5px] leading-5 text-zinc-400 sm:left-4 sm:top-3.5 sm:text-[15.5px]">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-violet-500 align-middle" />
                </span>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 sm:pt-3">
                <p className="hidden text-[11.5px] text-zinc-400 sm:block">Enter to build · Shift+Enter for new line</p>
                <span className="sm:hidden" />
                <button
                  type="button"
                  onClick={() => go()}
                  className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-[12.5px] font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] sm:h-11 sm:gap-2 sm:px-5 sm:text-[14px]"
                >
                  Build
                  <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 sm:size-[15px]" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-zinc-500 sm:mt-4 sm:gap-x-3 sm:text-[12px]">
            <span>HTML · React · Vite</span>
            <span className="text-zinc-300">·</span>
            <span>Publish live</span>
            <span className="text-zinc-300">·</span>
            <span>Download real files</span>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5 sm:mt-6 sm:gap-2">
            {CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(chip.prompt)}
                  className="lp-chip-in inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-2.5 py-1.5 text-[10.5px] font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md sm:px-3.5 sm:py-2 sm:text-[13px]"
                  style={{ animationDelay: `${220 + i * 40}ms` }}
                >
                  <Icon size={13} className="text-black" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="lp-hero-in mt-6 text-[10.5px] text-zinc-500 sm:mt-8 sm:text-[13px]" style={{ animationDelay: "280ms" }}>
          {freeCredits > 0 ? (
            <>
              <span className="font-medium text-emerald-600">{freeCredits} free credits</span>{" "}on signup · No card required
            </>
          ) : (
            "Sign up free · No card required"
          )}
        </p>
      </div>
    </section>
  );
}
