"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowUp, FiPaperclip, FiGlobe, FiFileText, FiGrid, FiLayers, FiSearch } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { useBuild } from "./use-build";

const PROMPTS = [
  "a launch site for my coffee roastery…",
  "a Q3 investor memo from these numbers…",
  "a 12-month budget model with runway…",
  "a 10-slide seed pitch deck…",
  "a competitive research brief on AI tools…",
];

const CHIPS = [
  { label: "Website", icon: FiGlobe, prompt: "Build a warm, premium landing page for my coffee roastery with a wholesale section" },
  { label: "Investor memo", icon: FiFileText, prompt: "Draft a crisp Q3 investor memo: traction, burn, runway, and asks" },
  { label: "Budget model", icon: FiGrid, prompt: "Build a 12-month budget model with revenue, costs, and runway" },
  { label: "Pitch deck", icon: FiLayers, prompt: "Create a 10-slide seed pitch deck with a clear narrative arc" },
  { label: "Research brief", icon: FiSearch, prompt: "Research the competitive landscape for AI productivity tools and summarize the top 5 players" },
];

/** Typewriter for the placeholder; pauses while the visitor is typing. */
function usePlaceholder(active: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setText(PROMPTS[0]), 0);
      return () => clearTimeout(t);
    }
    let i = 0, c = 0, del = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = PROMPTS[i];
      if (!del) {
        c++;
        setText(full.slice(0, c));
        if (c >= full.length) { del = true; t = setTimeout(tick, 1600); return; }
      } else {
        c--;
        setText(full.slice(0, c));
        if (c <= 0) { del = false; i = (i + 1) % PROMPTS.length; }
      }
      t = setTimeout(tick, del ? 18 : 38);
    };
    t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [active]);
  return text;
}

export function LvHero({ freeCredits }: { freeCredits: number }) {
  const build = useBuild();
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const placeholder = usePlaceholder(!value);

  return (
    <section className="lv-hero min-h-[100svh] px-4 pb-28 pt-32 text-white sm:px-6 sm:pt-40">
      {/* Slow-moving light so the gradient feels alive. */}
      <div aria-hidden className="lv-drift pointer-events-none absolute -bottom-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.18),transparent)] blur-3xl" />

      <div className="relative mx-auto flex max-w-[1100px] flex-col items-center text-center">
        <h1 className="lp-hero-in flex flex-wrap items-center justify-center gap-x-[0.28em] lg:flex-nowrap lg:whitespace-nowrap text-[clamp(2.5rem,1.3rem+4.4vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.045em]">
          <span>Build something with</span>
          <span className="inline-flex items-center gap-[0.18em]">
            <TroveOrb size={64} className="inline-block h-[0.82em] w-[0.82em]" />
            Trove
          </span>
        </h1>
        <p className="lp-hero-in mt-5 max-w-[46ch] text-[17px] leading-relaxed text-white/80 sm:text-[20px]" style={{ animationDelay: "80ms" }}>
          Describe the work. Get the files — sites, documents, spreadsheets and decks you keep, edit and publish.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            build(value);
          }}
          className="lv-prompt lp-hero-in mt-10 w-full max-w-[820px] text-left text-ink"
          style={{ animationDelay: "160ms" }}
        >
          <div className="relative px-5 pt-5">
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  build(value);
                }
              }}
              rows={3}
              aria-label="Describe what to build"
              className="block min-h-[84px] w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none sm:text-[17px]"
            />
            {!value ? (
              <span aria-hidden className="pointer-events-none absolute left-5 top-5 text-[16px] leading-relaxed text-ink-4 sm:text-[17px]">
                Ask Trove to create {placeholder}
                <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-ink-4 align-middle" />
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={() => build(value)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-ink-3 transition hover:bg-hover hover:text-ink"
              aria-label="Attach files (opens the workspace)"
            >
              <FiPaperclip size={14} aria-hidden /> Attach
            </button>
            <span className="hidden text-[12.5px] text-ink-4 sm:inline">Enter to build · Shift+Enter for a new line</span>
            <span className="flex-1" />
            <button
              type="submit"
              aria-label="Build"
              className="grid size-10 place-items-center rounded-full bg-ink text-canvas transition hover:opacity-90 disabled:opacity-40"
              disabled={!value.trim()}
            >
              <FiArrowUp size={18} aria-hidden />
            </button>
          </div>
        </form>

        <div className="lp-hero-in mt-5 flex flex-wrap justify-center gap-2" style={{ animationDelay: "220ms" }}>
          {CHIPS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  setValue(c.prompt);
                  ref.current?.focus();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <Icon size={14} aria-hidden /> {c.label}
              </button>
            );
          })}
        </div>

        <p className="lp-hero-in mt-6 text-[13px] text-white/70" style={{ animationDelay: "280ms" }}>
          {freeCredits > 0 ? `${freeCredits} free credits every month · No card required` : "Free to start · No card required"}
        </p>
      </div>
      <div aria-hidden className="lv-hero-fade" />
    </section>
  );
}
