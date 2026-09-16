"use client";

import Link from "next/link";
import { FiArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/reveal";
import { ServiceMark } from "@/components/integrations/service-mark";
import { ModelMark } from "@/components/chat/model-mark";
import type { ChatModelOption } from "@/lib/chat-models";

const APPS = [
  { id: "notion", name: "Notion" },
  { id: "google-drive", name: "Drive" },
  { id: "slack", name: "Slack" },
  { id: "gmail", name: "Gmail" },
  { id: "figma", name: "Figma" },
  { id: "github", name: "GitHub" },
  { id: "linear", name: "Linear" },
] as const;

export function LandingTrustedBar({ models }: { models: ChatModelOption[] }) {
  const shownModels = models.length ? models : [];

  return (
    <section className="relative px-4 py-8 sm:px-6 sm:py-12">
      <Reveal>
        <div className="mx-auto flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-full border border-black/[0.09] bg-white/90 px-2.5 py-2 shadow-[0_12px_35px_-22px_rgba(15,23,42,.42)] backdrop-blur-xl scrollbar-none sm:gap-2.5 sm:px-3">
          <span className="shrink-0 pl-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[12px]">Connect your tools</span>
          <span className="h-5 w-px shrink-0 bg-zinc-200" />
          {APPS.map((app, index) => (
            <Reveal key={app.id} delay={index * 24} as="div" className="shrink-0">
              <span className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:gap-2 sm:px-2 sm:text-[12px]">
                <ServiceMark id={app.id} name={app.name} size={24} monochrome />
                <span className="hidden sm:inline">{app.name}</span>
              </span>
            </Reveal>
          ))}
          <Link href="/integrations" className="ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:-translate-y-0.5 hover:bg-black" aria-label="Open integrations">
            <FiArrowRight size={14} />
          </Link>
        </div>
      </Reveal>

      <Reveal delay={90}>
        <p className="mx-auto mt-3 max-w-[52ch] text-center text-[11px] leading-5 text-zinc-500 sm:text-[12px]">Bring your files, context, and favorite apps into one workspace.</p>
      </Reveal>

      {shownModels.length ? (
        <div className="mx-auto mt-8 max-w-[900px] sm:mt-10">
          <Reveal>
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-[11px]">Choose your model in Chat</p>
          </Reveal>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {shownModels.map((model, index) => (
              <Reveal key={model.id} delay={index * 28} as="div">
                <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-2.5 py-1 pr-3 text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <ModelMark brand={model.brand} size={24} />
                  <span className="min-w-0 text-left">
                    <span className="block max-w-[150px] truncate text-[11.5px] font-semibold leading-4 text-zinc-800 sm:text-[12px]">{model.label}</span>
                    <span className="hidden text-[9.5px] leading-3 text-zinc-400 sm:block">{model.provider}</span>
                  </span>
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
