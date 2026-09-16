"use client";

import { useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import {
  DEFAULT_CHAT_MODEL,
  type ChatModelId,
  type ChatModelOption,
} from "@/lib/chat-models";
import { useChatThread } from "@/lib/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import type { Recent } from "@/lib/recents";

export function HomeChat({
  restored = null,
  name = "there",
  activity = [],
  draft: initialDraft = "",
  models = [],
}: {
  restored?: { id: string; title: string; messages: { role: "user" | "model"; text: string }[] } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
  models?: ChatModelOption[];
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [model, setModel] = useState<ChatModelId>(
    models.some((option) => option.id === DEFAULT_CHAT_MODEL)
      ? DEFAULT_CHAT_MODEL
      : (models[0]?.id ?? DEFAULT_CHAT_MODEL),
  );

  const { turns, busy, error, send, retry, regenerate, clear, bottom } = useChatThread({ restored, mode, model });
  const composerModelProps = { model, modelOptions: models, onModelChange: setModel, mode, onModeChange: setMode };

  if (turns.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        <div className="relative z-[1] flex flex-1 flex-col items-center px-5 pb-12 pt-[4.5vh] lg:pt-[7vh]">
          <div className="w-full max-w-[680px] text-center">
            <div className="nx-rise">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1 text-[11px] font-medium text-indigo-600 shadow-sm backdrop-blur-sm">
                <span className="text-[12px]">✦</span>
                Powered by Trove AI
              </div>
              <Greeting name={name} />
              <h1 className="mt-2 text-[clamp(1.9rem,1.2rem+2.2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
                What will you build today?
              </h1>
              <p className="mx-auto mt-2.5 max-w-[42ch] text-[14px] leading-relaxed text-ink-3">
                Describe an idea, automate a task, or create something new.
              </p>
            </div>

            <div className="nx-rise mt-6 text-left" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
              <Composer key={draft} initialValue={draft} onSend={send} {...composerModelProps} autoFocus disabled={busy} />
            </div>

            <StarterCards className="mt-5" onPick={setDraft} />
            <DesktopChartCard />

            {error ? <ErrorNote message={error} onRetry={retry} /> : null}

            {activity.length ? (
              <div className="nx-rise mt-8 text-left" style={{ animationDelay: "220ms", animationFillMode: "backwards" }}>
                <ContinuePanel items={activity} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3">
          <span className="truncate text-[13px] text-ink">{turns[0]?.text.slice(0, 64)}</span>
          <button onClick={clear} className="shrink-0 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[12px] text-ink-3 transition-colors hover:bg-hover hover:text-ink">
            New Chat
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 pt-7 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-7">
          {turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              files={t.files}
              pending={busy && i === turns.length - 1 && t.role === "model"}
              onRegenerate={!busy && i === turns.length - 1 && t.role === "model" ? regenerate : undefined}
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={retry} /> : null}
          <div ref={bottom} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-5 pt-3 lg:px-8">
        <div className="mx-auto max-w-[720px]">
          <Composer onSend={send} placeholder="Reply…" disabled={busy} {...composerModelProps} />
        </div>
      </div>
    </div>
  );
}

function DesktopChartCard() {
  return (
    <div className="nx-rise mx-auto mt-5 max-w-[560px] rounded-[20px] border border-line/80 bg-raised/85 p-4 text-left shadow-[0_18px_50px_-34px_rgba(15,23,42,.5)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Example deliverable</p>
          <h3 className="mt-1 text-[13px] font-semibold text-ink">6-month revenue dashboard</h3>
        </div>
        <span className="rounded-full bg-positive/10 px-2 py-1 text-[9.5px] font-semibold text-positive">Generated</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["$212K", "Revenue"], ["12.4K", "Visitors"], ["3.2%", "Conversion"]].map(([value, label]) => (
          <div key={label} className="rounded-xl border border-line/70 bg-sunk/35 px-3 py-2.5">
            <div className="text-[13px] font-semibold tabular-nums text-ink">{value}</div>
            <div className="mt-0.5 text-[9.5px] text-ink-4">{label}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-[92px] overflow-hidden rounded-xl border border-line/70 bg-gradient-to-b from-violet-50/80 to-white">
        <svg viewBox="0 0 560 92" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="desktop-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,74 C50,62 75,67 125,52 C165,40 200,54 250,39 C310,24 350,40 405,23 C462,8 500,18 560,9 L560,92 L0,92 Z" fill="url(#desktop-chart-fill)" />
          <path d="M0,74 C50,62 75,67 125,52 C165,40 200,54 250,39 C310,24 350,40 405,23 C462,8 500,18 560,9" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-5" />;
}
