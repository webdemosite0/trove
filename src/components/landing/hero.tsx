"use client";

import { FiGlobe, FiLayout, FiCreditCard, FiCalendar, FiLayers, FiGrid } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Build a portfolio site for a freelance motion designer…",
  "Create a monthly financial dashboard in a spreadsheet…",
  "Make a 10-slide investor pitch for my SaaS…",
  "Write a market research report as a Word doc…",
  "Build a modern landing page for an AI startup…",
];

const CHIPS: { label: string; icon: typeof FiGlobe; prompt: string }[] = [
  { label: "Website", icon: FiGlobe, prompt: "Build a premium landing page for a coffee brand" },
  { label: "Document", icon: FiLayout, prompt: "Create a professional market research report" },
  { label: "Spreadsheet", icon: FiGrid, prompt: "Build a monthly financial dashboard" },
  { label: "Presentation", icon: FiLayers, prompt: "Create a 10-slide startup pitch deck" },
  { label: "Shop", icon: FiCreditCard, prompt: "Design an online shop for handmade ceramics" },
  { label: "Booking", icon: FiCalendar, prompt: "Make a booking site for a specialty coffee roastery" },
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
    <section className="relative overflow-hidden px-5 pb-16 pt-14 lg:pb-24 lg:pt-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 70%, rgba(244,114,182,0.10), transparent 50%), radial-gradient(ellipse 45% 35% at 5% 85%, rgba(52,211,153,0.10), transparent 50%), radial-gradient(ellipse 40% 30% at 50% 55%, rgba(251,191,36,0.06), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="mx-auto max-w-[720px] text-center">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-4">
          AI that finishes the work
        </p>

        <h1 className="text-[clamp(2.25rem,1.6rem+3vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
          Describe it once.
          <br />
          <span className="wordmark-gradient">Keep the file.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-3 sm:text-[17.5px]">
          Trove doesn't just generate work. It keeps building with you —
          websites, docs, sheets, decks, code, and agents you can download and own.
        </p>

        <div className="mx-auto mt-9 max-w-[560px]">
          <div
            className={cn(
              "rounded-[16px] border border-line bg-raised/90 p-2 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md",
              "ring-1 ring-black/[0.03]",
            )}
          >
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
              placeholder={value ? "" : typed || "Describe what to build…"}
              className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-4"
            />
            <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
              <span className="text-[11.5px] text-ink-4">Press Enter to start</span>
              <button
                type="button"
                onClick={() => go()}
                className="grid size-10 place-items-center rounded-full bg-ink text-white transition hover:opacity-90 active:scale-[0.97]"
                aria-label="Start building"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => go(chip.prompt)}
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
              <span className="font-medium text-ink-2">{freeCredits} free credits</span>
              {" · "}No card required · Download real files
            </>
          ) : (
            "Sign up free · No card required"
          )}
        </p>
      </div>
    </section>
  );
}
