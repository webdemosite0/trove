"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    tab: "Website Builder",
    title: "One prompt. A live website.",
    body: "Describe a site — Trove writes the files, shows a live preview, and keeps editing it in the same conversation.",
    src: "/auth/studio.mp4",
  },
  {
    tab: "AI Agents",
    title: "Agents that actually run.",
    body: "Spin up an agent, connect tools, and watch the work happen in the same workspace — not a mock.",
    src: "/auth/agents.mp4",
  },
  {
    tab: "Workspace",
    title: "Docs, sheets, and sites in one chat.",
    body: "One composer. Real files out the other side. Download them whenever you want.",
    src: "/auth/studio.mp4",
  },
] as const;

/**
 * Higgsfield-style split: product film on the left, form on the right.
 * The film is Trove's own UI, not stock.
 */
export function SplitAuth({ children }: { children: React.ReactNode }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 9000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <aside className="relative h-[42vh] min-h-[280px] overflow-hidden bg-neutral-950 lg:h-auto lg:min-h-dvh">
        {["/auth/studio.mp4", "/auth/agents.mp4"].map((src) => (
          <video
            key={src}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              slide.src === src ? "opacity-100" : "opacity-0",
            )}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden={slide.src !== src}
          />
        ))}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.15)_38%,rgba(0,0,0,0.55)_100%)]"
        />

        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-1 overflow-x-auto px-5 pt-5 lg:gap-x-7 lg:px-10 lg:pt-8">
          {SLIDES.map((s, n) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => setI(n)}
              className={cn(
                "relative pb-2 text-[13.5px] font-medium tracking-[-0.01em] transition-colors",
                n === i ? "text-white" : "text-white/55 hover:text-white/80",
              )}
            >
              {s.tab}
              {n === i ? (
                <span className="absolute inset-x-0 -bottom-px h-px bg-white" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-16 lg:px-10 lg:pb-12 lg:pt-24">
          <h2
            key={slide.title}
            className="max-w-[18ch] text-[clamp(1.35rem,3vw,2.65rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-white"
          >
            {slide.title}
          </h2>
          <p
            key={slide.body}
            className="mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-white/78"
          >
            {slide.body}
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-col bg-white text-neutral-950 lg:min-h-dvh">
        <div className="flex items-center justify-between px-6 pt-5 sm:px-10">
          <Link href="/" className="text-[15px] font-semibold tracking-[-0.03em] text-neutral-950">
            Trove
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-10 sm:px-8">
          <div className="mb-8 flex justify-center gap-1.5">
            {SLIDES.map((s, n) => (
              <button
                key={s.tab}
                type="button"
                aria-label={s.tab}
                onClick={() => setI(n)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  n === i ? "w-5 bg-[#4f46e5]" : "w-1.5 bg-neutral-300 hover:bg-neutral-400",
                )}
              />
            ))}
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
