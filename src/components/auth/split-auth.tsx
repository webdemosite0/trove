"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    tab: "Sites",
    title: "One prompt. A live website.",
    body: "Describe a site — Trove writes the files, shows a live preview, and keeps editing it in the same conversation.",
    src: "/auth/studio.mp4",
  },
  {
    tab: "Agents",
    title: "Agents that actually run.",
    body: "Spin up an agent, connect tools, and watch the work happen in the same workspace.",
    src: "/auth/agents.mp4",
  },
  {
    tab: "Chat",
    title: "Docs, sheets, and sites in one chat.",
    body: "One composer. Real files out the other side. Download them whenever you want.",
    src: "/auth/studio.mp4",
  },
] as const;

function ProductStage() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-canvas">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 20%, color-mix(in oklab, var(--color-accent) 28%, transparent), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, color-mix(in oklab, var(--color-violet) 18%, transparent), transparent)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(92%,720px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--r-panel)] border border-line bg-rail shadow-[var(--sh-3)]">
        <div className="flex h-8 items-center gap-1.5 border-b border-line px-3">
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="ml-2 text-[10px] tracking-[0.14em] text-ink-4">TROVE</span>
        </div>
        <div className="grid h-[280px] grid-cols-[1fr_1.15fr] sm:h-[360px]">
          <div className="flex flex-col gap-2 border-r border-line p-3">
            <div className="ml-auto w-[78%] rounded-[var(--r-control)] bg-raised px-2.5 py-2 text-[11px] text-ink-2">
              Build a coffee roaster shop
            </div>
            <div className="nx-dots w-[70%] rounded-[var(--r-control)] bg-sunk px-2.5 py-2 text-[11px] text-ink-3">
              Writing the site
            </div>
            <div className="mt-auto h-9 rounded-full border border-line bg-sunk" />
          </div>
          <div className="relative bg-sunk p-2.5">
            <div className="nx-in h-full overflow-hidden rounded-[var(--r-chip)] border border-line bg-raised">
              <div className="h-1.5 w-full bg-accent/80" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-2/3 rounded-full bg-ink/15" />
                <div className="h-2 w-full rounded-full bg-ink/8" />
                <div className="h-2 w-5/6 rounded-full bg-ink/8" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-[var(--r-chip)] bg-accent/15" />
                  <div className="h-16 rounded-[var(--r-chip)] bg-violet/15" />
                  <div className="h-16 rounded-[var(--r-chip)] bg-accent/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Product film on the left, form on the right — Trove tokens throughout.
 */
export function SplitAuth({ children }: { children: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const slide = SLIDES[i];

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 9000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setReady(false);
    const el = video.current;
    if (!el) return;
    el.src = slide.src;
    el.load();
    const play = () => {
      el.play().then(() => setReady(true)).catch(() => setReady(false));
    };
    el.addEventListener("canplay", play, { once: true });
    return () => el.removeEventListener("canplay", play);
  }, [slide.src]);

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <aside className="relative h-[42vh] min-h-[280px] overflow-hidden bg-sunk lg:h-auto lg:min-h-dvh">
        <ProductStage />
        <video
          ref={video}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setReady(false)}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-canvas)_55%,transparent)_0%,transparent_38%,color-mix(in_oklab,var(--color-canvas)_70%,transparent)_100%)]"
        />

        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-1 overflow-x-auto px-5 pt-5 lg:gap-x-7 lg:px-10 lg:pt-8">
          {SLIDES.map((s, n) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => setI(n)}
              className={cn(
                "relative pb-2 text-[13.5px] font-medium tracking-[-0.01em] transition-colors",
                n === i ? "text-ink" : "text-ink-4 hover:text-ink-2",
              )}
            >
              {s.tab}
              {n === i ? (
                <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-16 lg:px-10 lg:pb-12 lg:pt-24">
          <h2
            key={slide.title}
            className="nx-in max-w-[18ch] text-[clamp(1.35rem,3vw,2.65rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-ink"
          >
            {slide.title}
          </h2>
          <p
            key={slide.body}
            className="nx-in mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-ink-2"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            {slide.body}
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-col bg-canvas lg:min-h-dvh">
        <div className="flex items-center justify-between px-6 pt-5 sm:px-10">
          <Link href="/" className="text-[15px] font-semibold tracking-[-0.03em] text-ink">
            Trove
          </Link>
        </div>

        <div className="nx-in mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-10 sm:px-8">
          <div className="mb-8 flex justify-center gap-1.5">
            {SLIDES.map((s, n) => (
              <button
                key={s.tab}
                type="button"
                aria-label={s.tab}
                onClick={() => setI(n)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  n === i ? "w-5 bg-accent" : "w-1.5 bg-line-strong hover:bg-ink-4",
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
