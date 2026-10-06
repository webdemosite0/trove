"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiFileText,
  FiGlobe,
  FiLayout,
  FiCreditCard,
  FiCalendar,
  FiLayers,
  FiGrid,
  FiSearch,
  FiArrowRight,
  FiCheck,
  FiZap,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";

const PROMPTS = [
  "Build a portfolio site for a freelance motion designer…",
  "Make a booking site for a specialty coffee roastery…",
  "Create a landing page for an AI SaaS startup…",
  "Design an online shop for handmade ceramics…",
  "Draft a Q3 investor memo from these numbers…",
];

const CHIPS: { label: string; icon: typeof FiFileText; prompt: string }[] = [
  { label: "Investor memo", icon: FiLayers, prompt: "Draft a crisp Q3 investor memo: traction, burn, runway, and asks" },
  { label: "Pitch deck", icon: FiGrid, prompt: "Create a 10-slide seed pitch deck with a clear narrative arc" },
  { label: "Budget model", icon: FiCreditCard, prompt: "Build a 12-month budget model with revenue, costs, and runway" },
  { label: "Research brief", icon: FiSearch, prompt: "Research the competitive landscape for AI productivity tools and summarize the top 5 players" },
  { label: "Brand guide", icon: FiLayout, prompt: "Design a brand identity guide with colors, typography, and logo usage" },
  { label: "Project plan", icon: FiCalendar, prompt: "Create a 90-day project plan with milestones, owners, and deliverables" },
];

const CAPABILITIES = [
  "Documents",
  "Spreadsheets",
  "Decks",
  "Research",
  "Tros",
];

function ProductVisual() {
  return (
    <div className="relative mx-auto mt-12 max-w-[1020px] sm:mt-16">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-12 bottom-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.22),transparent_70%)] blur-2xl dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(129,140,248,0.28),transparent_70%)]"
      />
      <div className="lp-hero-in relative overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_40px_120px_-32px_rgba(99,102,241,0.4)] sm:rounded-3xl" style={{ animationDelay: "340ms" }}>
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-sunk/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 hidden items-center gap-1.5 rounded-md bg-hover px-2.5 py-1 text-[11px] text-ink-4 sm:flex">
            <FiGlobe size={11} /> troveai.site/chat
          </span>
        </div>
        <div className="grid sm:grid-cols-[1fr_1.1fr]">
          {/* chat side */}
          <div className="space-y-3 border-b border-line p-4 sm:border-b-0 sm:border-r sm:p-5">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white shadow-lg shadow-violet-500/20">
                Build a landing page for my coffee roastery — warm, premium, with a wholesale section.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <TroveOrb size={26} state="idle" />
              <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-sunk/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
                On it — drafting the page now. Hero, story, roast lineup, and wholesale inquiry below.
                <span className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Building… 3 sections done
                </span>
              </div>
            </div>
          </div>
          {/* artifact side */}
          <div className="relative bg-sunk/40 p-4 sm:p-5">
            <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-[0_16px_48px_-20px_rgba(15,23,42,0.35)]">
              <div className="bg-gradient-to-br from-amber-900 via-[#2b1d12] to-[#1a120b] px-5 py-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/80">Ember &amp; Oak</p>
                <p className="mt-2 text-[19px] font-semibold tracking-tight text-amber-50">Coffee worth slowing down for.</p>
                <p className="mx-auto mt-1.5 max-w-[30ch] text-[11px] leading-relaxed text-amber-100/70">Small-batch roasts, delivered fresh every week.</p>
                <span className="mt-3 inline-block rounded-full bg-amber-100 px-3.5 py-1.5 text-[10.5px] font-semibold text-amber-950">Shop the roasts</span>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <FiCheck size={12} /> ember-and-oak.html
                </span>
                <span className="text-[11px] text-ink-4">Download · Publish</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-3 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-black/20 blur-xl dark:bg-black/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero({ freeCredits }: { freeCredits: number }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(PROMPTS[0]);
      return;
    }
    const full = PROMPTS[promptIndex];
    const speed = deleting ? 20 : 34;
    const t = setTimeout(() => {
      if (!deleting) {
        if (charIndex < full.length) {
          setTyped(full.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1500);
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
      router.push("/chat");
      return;
    }
    router.push(`/chat?q=${encodeURIComponent(idea.slice(0, 2000))}`);
  }

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-5 sm:pb-16 sm:pt-14 lg:pt-20">
      {/* aurora backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-320px] h-[640px] w-[min(1100px,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.28),rgba(99,102,241,0.14),transparent)] blur-3xl dark:bg-[radial-gradient(closest-side,rgba(139,92,246,0.32),rgba(99,102,241,0.16),transparent)]" />
        <div className="absolute left-[8%] top-[10%] h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-500/12" />
        <div className="absolute right-[6%] top-[22%] h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-500/12" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
          style={{
            backgroundImage: "linear-gradient(rgba(128,128,128,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.09) 1px, transparent 1px)",
            backgroundSize: "54px 54px",
            maskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1060px] text-center">
        <Link
          href="/features/tros"
          className="lp-hero-in group mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-raised/80 py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-ink-2 shadow-sm backdrop-blur-md transition hover:border-line-strong hover:text-ink sm:mb-7 sm:text-[13px]"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            <FiZap size={11} /> New
          </span>
          Meet Tros — AI specialists you brief
          <FiArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>

        <h1
          className="lp-hero-in mx-auto max-w-[16ch] text-[clamp(2.4rem,1.6rem+4.2vw,4.9rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink"
          style={{ animationDelay: "70ms" }}
        >
          Describe the work.
          <br />
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-300 dark:to-fuchsia-400">
            Get the files.
          </span>
        </h1>

        <p
          className="lp-hero-in mx-auto mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-3 sm:mt-6 sm:text-[18px]"
          style={{ animationDelay: "140ms" }}
        >
          Trove is the AI workspace for businesses, solo entrepreneurs, and one-person
          businesses. Describe the work once in chat — a site, a deck, a model, a memo —
          and get back real files you keep, refine, and publish.
        </p>

        <div className="lp-hero-in mx-auto mt-6 max-w-[760px] sm:mt-9" style={{ animationDelay: "200ms" }}>
          <div className="rounded-[20px] border border-line bg-raised/85 p-1.5 shadow-[0_24px_80px_-24px_rgba(99,102,241,0.4),0_0_0_1px_rgba(99,102,241,0.07)] backdrop-blur-xl sm:rounded-[26px] sm:p-2">
            <div className="relative flex min-h-[72px] flex-col rounded-[15px] bg-gradient-to-b from-sunk/90 to-raised px-3.5 py-3 ring-1 ring-line sm:min-h-[88px] sm:rounded-[20px] sm:px-5 sm:py-3.5">
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
                className="w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-ink-4 sm:text-[16px]"
                placeholder=""
                aria-label="Describe what to build"
              />
              {!value && (
                <span className="pointer-events-none absolute left-3.5 top-3 max-w-[calc(100%-5rem)] text-left text-[13.5px] leading-6 text-ink-4 sm:left-5 sm:top-3.5 sm:text-[16px]">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-violet-500 align-middle" />
                </span>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 sm:pt-3">
                <p className="hidden text-[12px] text-ink-4 sm:block">Enter to build · Free account required · Shift+Enter for new line</p>
                <span className="sm:hidden" />
                <button
                  type="button"
                  onClick={() => go()}
                  className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-[13.5px] font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] sm:text-[14.5px]"
                >
                  Build
                  <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap justify-center gap-1.5 sm:mt-5 sm:gap-2">
            {CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(chip.prompt)}
                  className="lp-chip-in inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-raised/90 px-3 py-1.5 text-[12px] font-medium text-ink-2 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:text-ink hover:shadow-md sm:px-3.5 sm:py-2 sm:text-[13px]"
                  style={{ animationDelay: `${260 + i * 40}ms` }}
                >
                  <Icon size={13} aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="lp-hero-in mt-4 text-[12px] text-ink-3 sm:mt-6 sm:text-[13.5px]" style={{ animationDelay: "300ms" }}>
          {freeCredits > 0 ? (
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{freeCredits} free credits</span>
              {" "}on signup · No card required
            </>
          ) : (
            "Sign up free · No card required"
          )}
        </p>

        <ProductVisual />

        <div className="lp-hero-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:mt-10" style={{ animationDelay: "400ms" }}>
          {CAPABILITIES.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 sm:text-[13.5px]">
              <FiCheck size={13} className="text-emerald-500" /> {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
