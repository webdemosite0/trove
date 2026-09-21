"use client";

import { FiDownload, FiLock, FiFolder, FiRefreshCw } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/reveal";

const POINTS = [
  {
    title: "Your work stays yours",
    body: "Projects live in your workspace. Export files when you need them.",
    Icon: FiFolder,
  },
  {
    title: "Download the actual files",
    body: "Word, Excel, slides, site code — not trapped inside a chat thread.",
    Icon: FiDownload,
  },
  {
    title: "Keep building, don’t start over",
    body: "Refine the same project in chat. Changes apply to what you already made.",
    Icon: FiRefreshCw,
  },
  {
    title: "Publish when ready",
    body: "Ship to your own subdomain on *.troveai.site — or unpublish anytime.",
    Icon: FiLock,
  },
];

export function TrustSection() {
  return (
    <section className="relative border-y border-zinc-200/80 bg-white/50 dark:border-line dark:bg-raised/35 px-5 py-20 backdrop-blur-sm lg:py-24">
      <div className="mx-auto max-w-[1140px]">
        <Reveal className="mx-auto max-w-[44ch] text-center">
          <h2 className="text-[clamp(1.6rem,1.1rem+1.5vw,2.2rem)] font-semibold tracking-tight text-zinc-900 dark:text-ink">
            Your projects are not trapped inside a chat.
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-zinc-600 dark:text-ink-3">
            Trove is built so finished work can leave the product — as files you own, and sites you
            control.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => {
            const Icon = p.Icon;
            return (
              <Reveal key={p.title} delay={i * 60}>
                <div className="h-full rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-line dark:bg-raised dark:shadow-[var(--sh-1)] transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-zinc-900 dark:text-ink">{p.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600 dark:text-ink-3">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
