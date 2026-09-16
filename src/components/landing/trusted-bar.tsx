"use client";

import { Reveal } from "@/components/landing/reveal";
import { ServiceMark } from "@/components/integrations/service-mark";
import { ModelMark } from "@/components/chat/model-mark";
import type { ChatModelOption } from "@/lib/chat-models";

const APPS = [
  { id: "gmail", name: "Gmail" },
  { id: "slack", name: "Slack" },
  { id: "github", name: "GitHub" },
  { id: "google-drive", name: "Google Drive" },
  { id: "notion", name: "Notion" },
  { id: "linear", name: "Linear" },
  { id: "figma", name: "Figma" },
  { id: "stripe", name: "Stripe" },
  { id: "vercel", name: "Vercel" },
  { id: "supabase", name: "Supabase" },
] as const;

export function LandingTrustedBar({ models }: { models: ChatModelOption[] }) {
  const shownModels = models.length ? models : [];

  return (
    <section className="border-y border-zinc-200/80 bg-white/45 px-5 py-14 backdrop-blur-sm">
      <Reveal>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Connect the apps you already work in
        </p>
      </Reveal>

      <div className="mx-auto mt-7 flex max-w-[1040px] flex-wrap items-center justify-center gap-2.5">
        {APPS.map((app, index) => (
          <Reveal key={app.id} delay={index * 28} as="div">
            <span className="inline-flex h-11 items-center gap-2.5 rounded-full border border-zinc-200/90 bg-white px-3.5 pr-4 text-[13px] font-semibold text-zinc-700 shadow-[0_5px_20px_-12px_rgba(15,23,42,.35)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md">
              <ServiceMark id={app.id} name={app.name} size={26} />
              <span>{app.name}</span>
            </span>
          </Reveal>
        ))}
      </div>

      {shownModels.length ? (
        <>
          <Reveal delay={120}>
            <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Choose the model in Chat
            </p>
          </Reveal>
          <div className="mx-auto mt-5 flex max-w-[900px] flex-wrap items-center justify-center gap-2.5">
            {shownModels.map((model, index) => (
              <Reveal key={model.id} delay={140 + index * 35} as="div">
                <span className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 pr-4 text-zinc-700 shadow-sm">
                  <ModelMark brand={model.brand} size={28} />
                  <span className="min-w-0 text-left">
                    <span className="block max-w-[180px] truncate text-[13px] font-semibold leading-4 text-zinc-800">
                      {model.label}
                    </span>
                    <span className="block text-[10.5px] leading-4 text-zinc-400">
                      {model.provider}
                    </span>
                  </span>
                </span>
              </Reveal>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
