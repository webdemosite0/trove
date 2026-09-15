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
  FiZap,
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
    <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:pt-18 lg:pb-24 lg:pt-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl opacity-70">
        <div className="absolute left-1/2 top-8 h-64 w-[min(90%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400/25 via-indigo-300/20 to-fuchsia-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[960px] text-center">
        <div className="lp-hero-in mb-7 inline-flex items-center gap-2.5 rounded-full border border-violet-200/80 bg-white/70 px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm shadow-violet-500/5 backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <FiZap size={13} className="text-violet-600" aria-hidden />
          AI that ships real files — not just chat
        </div>

        <h1 className="lp-hero-in text-[clamp(2.55rem,1.1rem+4.2vw,4.35rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-zinc-900" style={{ animationDelay: "60ms" }}>
          Describe it once.
          <br />
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            Keep the file.
          </span>
        </h1>

        <p
          className="lp-hero-in mx-auto mt-6 max-w-[52ch] text-[17px] leading-relaxed text-zinc-600 sm:text-[18px]"
          style={{ animationDelay: "120ms" }}
        >
          Turn a single prompt into multi-page websites, docs, decks, and code — then download
          production files or publish live on{" "}
          <span className="font-medium text-zinc-800">*.troveai.site</span>.
        </p>

        <div className="lp-hero-in mx-auto mt-11 max-w-[740px]" style={{ animationDelay: "180ms" }}>
          <div className="rounded-[28px] border border-white/80 bg-white/80 p-2 shadow-[0_24px_80px_-24px_rgba(99,102,241,0.35),0_0_0_1px_rgba(99,102,241,0.06)] backdrop-blur-xl">
            <div className="relative flex min-h-[100px] flex-col rounded-[22px] bg-gradient-to-b from-zinc-50/90 to-white px-4 py-3.5 ring-1 ring-zinc-200/80">
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
                className="w-full resize-none bg-transparent text-[15.5px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                placeholder=""
                aria-label="Describe what to build"
              />
              {!value && (
                <span className="pointer-events-none absolute left-4 top-3.5 max-w-[calc(100%-5rem)] text-left text-[15.5px] text-zinc-400">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1.15em] w-[2px] animate-pulse bg-violet-500 align-middle" />
                </span>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <p className="text-[11.5px] text-zinc-400">Enter to build · Shift+Enter for new line</p>
                <button
                  type="button"
                  onClick={() => go()}
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-[14px] font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
                >
                  Build
                  <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-zinc-500">
            <span>HTML · React · Vite</span>
            <span className="text-zinc-300">·</span>
            <span>Publish to subdomain</span>
            <span className="text-zinc-300">·</span>
            <span>Download real files</span>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(chip.prompt)}
                  className="lp-chip-in inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-3.5 py-2 text-[13px] font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 hover:shadow-md"
                  style={{ animationDelay: `${220 + i * 40}ms` }}
                >
                  <Icon size={14} className="text-violet-500" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="lp-hero-in mt-8 text-[13px] text-zinc-500" style={{ animationDelay: "280ms" }}>
          {freeCredits > 0 ? (
            <>
              <span className="font-medium text-emerald-600">{freeCredits} free credits</span>
              {" "}on signup · No card required
            </>
          ) : (
            "Sign up free · No card required"
          )}
        </p>
      </div>
    </section>
  );
}
