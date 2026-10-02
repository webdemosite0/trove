"use client";

import { TbMessageCircle, FiEdit3, FiDownload } from "@/components/ui/icons";

const STEPS = [
  {
    n: "01",
    icon: TbMessageCircle,
    title: "Describe it",
    desc: "Tell Trove what you need in plain words — a site, a memo, a model, a deck. Attach context if you have it.",
    tone: "#8b5cf6",
  },
  {
    n: "02",
    icon: FiEdit3,
    title: "Refine in chat",
    desc: "Trove builds the first version in seconds. Then you iterate together — every change is a conversation, not a ticket.",
    tone: "#3b82f6",
  },
  {
    n: "03",
    icon: FiDownload,
    title: "Keep the files",
    desc: "Download real HTML, DOCX, XLSX, and PPTX — or publish straight to the web. Your work is yours, forever.",
    tone: "#22c55e",
  },
];

export function HowItWorks() {
  return (
    <section className="relative px-4 py-14 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[1140px]">
        <div className="mx-auto max-w-[620px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            How it works
          </p>
          <h2 className="mt-3 text-[clamp(1.7rem,1.3rem+2vw,2.6rem)] font-semibold tracking-[-0.035em] text-ink">
            From idea to files in three steps.
          </h2>
        </div>

        <div className="relative mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-16 hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent sm:block"
          />
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className="group relative rounded-3xl border border-line bg-raised p-7 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_24px_64px_-24px_rgba(99,102,241,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${s.tone}1a`, color: s.tone }}
                  >
                    <Icon size={21} />
                  </span>
                  <span className="text-[13px] font-bold tracking-[0.18em] text-ink-4">{s.n}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
