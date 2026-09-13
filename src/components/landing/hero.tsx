"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FiGlobe,
  FiLayout,
  FiCreditCard,
  FiCalendar,
  FiLayers,
  FiGrid,
} from "@/components/ui/icons";

const PROMPTS = [
  "Build a portfolio site for a freelance motion designer…",
  "Make a booking site for a specialty coffee roastery…",
  "Create a landing page for an AI SaaS startup…",
  "Design an online shop for handmade ceramics…",
  "Build a case-study site for a design studio…",
];

const CHIPS: { label: string; icon: typeof FiGlobe }[] = [
  { label: "Portfolio", icon: FiLayout },
  { label: "Landing page", icon: FiGlobe },
  { label: "Online shop", icon: FiCreditCard },
  { label: "Booking site", icon: FiCalendar },
  { label: "SaaS marketing", icon: FiLayers },
  { label: "Agency site", icon: FiGrid },
];

/**
 * MagicSlides-inspired hero: centered headline, typing placeholder,
 * large prompt box, suggestion chips with icons.
 */
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
    const speed = deleting ? 28 : 42;
    const t = setTimeout(() => {
      if (!deleting) {
        if (charIndex < full.length) {
          setTyped(full.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1400);
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
    if (!idea) return;
    router.push(`/websites?q=${encodeURIComponent(idea.slice(0, 2000))}`);
  }

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-16 lg:pb-28 lg:pt-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(99,102,241,0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(236,72,153,0.08), transparent), radial-gradient(ellipse 40% 30% at 15% 80%, rgba(34,197,94,0.06), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[920px] text-center">
        <div className="nx-rise mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-raised/80 px-4 py-1.5 text-[13px] text-ink-2 shadow-sm backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-positive" />
          </span>
          10,000+ sites built with Trove
        </div>

        <h1 className="nx-rise-big text-[clamp(2.4rem,1.2rem+3.6vw,4.1rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink">
          Trove AI Website Builder
          <br />
          <span className="bg-gradient-to-r from-accent via-indigo-400 to-pink-400 bg-clip-text text-transparent">
            From Idea to Live Site in One Click
          </span>
        </h1>

        <p
          className="nx-rise mx-auto mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-3"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          Describe any product, portfolio, or shop. Trove builds a full multi-page
          site with live preview, refine chat, and one-click publish to{" "}
          <span className="font-medium text-ink-2">*.troveai.site</span>.
        </p>

        <div
          className="nx-rise mx-auto mt-10 max-w-[720px]"
          style={{ animationDelay: "140ms", animationFillMode: "backwards" }}
        >
          <div className="rounded-[28px] border border-line bg-raised/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="relative flex min-h-[88px] flex-col rounded-[22px] bg-sunk/40 px-4 py-3">
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
                className="w-full resize-none bg-transparent text-[15.5px] leading-relaxed text-ink outline-none placeholder:text-ink-4"
                placeholder=""
                aria-label="Describe what to build"
              />
              {!value && (
                <span className="pointer-events-none absolute left-4 top-3 max-w-[calc(100%-4rem)] truncate text-left text-[15.5px] text-ink-4">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-accent align-middle" />
                </span>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full text-ink-4 transition hover:bg-hover hover:text-ink"
                  aria-label="Attach"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => go()}
                  className="grid size-10 place-items-center rounded-full bg-ink text-white transition hover:opacity-90"
                  aria-label="Build"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-ink-4">
            <span>HTML · React · Vite</span>
            <span>·</span>
            <span>JPG · PNG</span>
            <span>·</span>
            <span>URLs · Figma links</span>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(`Build a ${chip.label.toLowerCase()} for my business`)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] text-ink-2 transition hover:border-accent/40 hover:bg-hover hover:text-ink"
                >
                  <Icon size={14} className="text-accent/80" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-[13px] text-ink-4">
          {freeCredits > 0 ? (
            <>
              <span className="text-positive">{freeCredits} free credits</span> on signup · No card required
            </>
          ) : (
            "Sign up free · No card required"
          )}
        </p>
      </div>
    </section>
  );
}
