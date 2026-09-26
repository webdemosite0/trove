"use client";

import { FiDownload, FiLock, FiFolder, FiRefreshCw } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/reveal";

const POINTS = [
  {
    title: "Work stays in your workspace",
    body: "Projects, chats, and outputs live under your account — not lost when the tab closes.",
    Icon: FiFolder,
  },
  {
    title: "Refine without starting over",
    body: "Keep building in the same project. Changes apply to what you already made.",
    Icon: FiRefreshCw,
  },
  {
    title: "Publish when ready",
    body: "Ship sites to your subdomain on *.troveai.site — or unpublish anytime.",
    Icon: FiLock,
  },
  {
    title: "Export when you need a file",
    body: "Word, Excel, slides, and project code — available when work has to leave Trove.",
    Icon: FiDownload,
  },
];

export function TrustSection() {
  return (
    <section className="relative border-y border-zinc-200/80 bg-white/50 px-5 py-20 backdrop-blur-sm lg:py-24">
      <div className="mx-auto max-w-[1140px]">
        <Reveal className="mx-auto max-w-[44ch] text-center">
          <h2 className="text-[clamp(1.6rem,1.1rem+1.5vw,2.2rem)] font-semibold tracking-tight text-zinc-900">
            Built as a workspace — not a disposable chat.
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-zinc-600">
            Describe work, iterate in conversation, publish or export when you are ready.
            Your projects stay where you left them.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => {
            const Icon = p.Icon;
            return (
              <Reveal key={p.title} delay={i * 60}>
                <div className="h-full rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-zinc-900">{p.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
