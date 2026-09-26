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
    <section className="relative overflow-hidden px-4 pb-10 pt-6 sm:px-5 sm:pb-14 sm:pt-10 lg:pb-16 lg:pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl opacity-70">
        <div className="absolute left-1/2 top-8 h-64 w-[min(90%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400/25 via-indigo-300/20 to-fuchsia-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[960px] text-center">
        <div className="lp-hero-in mb-3.5 inline-flex items-center rounded-full border border-line bg-raised/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-2 shadow-sm backdrop-blur-md sm:mb-5 sm:px-4 sm:text-[11px]">
          AI WORKSPACE · CHAT · BUILD · PUBLISH
        </div>

        <h1
          className="lp-hero-in text-[clamp(1.95rem,1.4rem+2.8vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.038em] text-ink"
          style={{ animationDelay: "60ms" }}
        >
          Describe it once.
          <br />
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            Trove builds it.
          </span>
        </h1>

        <p
          className="lp-hero-in mx-auto mt-3 max-w-[50ch] text-[13.5px] leading-6 text-ink-3 sm:mt-4 sm:text-[16px] sm:leading-relaxed lg:text-[17px]"
          style={{ animationDelay: "120ms" }}
        >
          Websites, documents, spreadsheets, presentations, research, and agents — in one workspace. Refine in chat, publish live, or export when you need the file.
        </p>

        <div className="lp-hero-in mx-auto mt-5 max-w-[740px] sm:mt-7" style={{ animationDelay: "180ms" }}>
          <div className="rounded-[22px] border border-line bg-raised/82 p-1.5 shadow-[0_24px_80px_-24px_rgba(99,102,241,0.35),0_0_0_1px_rgba(99,102,241,0.06)] backdrop-blur-xl sm:rounded-[28px] sm:p-2">
            <div className="relative flex min-h-[72px] flex-col rounded-[17px] bg-gradient-to-b from-sunk/90 to-raised px-3.5 py-2.5 ring-1 ring-line sm:min-h-[84px] sm:rounded-[22px] sm:px-4 sm:py-3">
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
                className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-4 sm:text-[15.5px]"
                placeholder=""
                aria-label="Describe what to build"
              />
              {!value && (
                <span className="pointer-events-none absolute left-3.5 top-3 max-w-[calc(100%-4.6rem)] text-left text-[13.5px] leading-5 text-ink-4 sm:left-4 sm:top-3.5 sm:text-[15.5px]">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-violet-500 align-middle" />
                </span>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 sm:pt-3">
                <p className="hidden text-[11.5px] text-ink-4 sm:block">Enter to build · Shift+Enter for new line</p>
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

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-ink-3 sm:mt-4 sm:gap-x-3 sm:text-[12px]">
            <span>Live preview</span>
            <span className="text-ink-4">·</span>
            <span>Publish on *.troveai.site</span>
            <span className="text-ink-4">·</span>
            <span>Export DOCX · XLSX · PPTX</span>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:mt-5 sm:gap-2">
            {CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(chip.prompt)}
                  className="lp-chip-in inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/90 px-2.5 py-1.5 text-[10.5px] font-medium text-ink-2 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink hover:shadow-md sm:px-3.5 sm:py-2 sm:text-[13px]"
                  style={{ animationDelay: `${220 + i * 40}ms` }}
                >
                  <Icon size={13} className="text-ink" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="lp-hero-in mt-4 text-[10.5px] text-ink-3 sm:mt-5 sm:text-[13px]" style={{ animationDelay: "280ms" }}>
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
