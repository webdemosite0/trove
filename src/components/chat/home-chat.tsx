"use client";

import { useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/lib/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import type { Recent } from "@/lib/recents";

export function HomeChat({
  restored = null,
  name = "there",
  activity = [],
  draft: initialDraft = "",
}: {
  restored?: { id: string; title: string; messages: { role: "user" | "model"; text: string }[] } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);

  const { turns, busy, error, send, retry, regenerate, clear, bottom } = useChatThread({
    restored,
    mode,
  });

  if (turns.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        <div className="relative z-[1] flex flex-1 flex-col items-center px-5 pb-14 pt-[6vh] lg:pt-[9vh]">
          <div className="w-full max-w-[720px] text-center">
            <div className="nx-rise">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1 text-[12px] font-medium text-indigo-600 shadow-sm backdrop-blur-sm">
                <span className="text-[13px]">✦</span>
                Powered by Trove AI
              </div>
              <Greeting name={name} />
              <h1 className="mt-2.5 text-[clamp(2.1rem,1.1rem+2.8vw,3.35rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
                What will you build today?
              </h1>
              <p className="mx-auto mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-ink-3">
                Describe an idea, automate a task, or create something new.
              </p>
            </div>

            <div
              className="nx-rise mt-7 text-left"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              <Composer
                key={draft}
                initialValue={draft}
                onSend={send}
                mode={mode}
                onModeChange={setMode}
                autoFocus
                disabled={busy}
              />
            </div>

            <StarterCards className="mt-6" onPick={setDraft} />

            {error ? <ErrorNote message={error} onRetry={retry} /> : null}

            {activity.length ? (
              <div
                className="nx-rise mt-10 text-left"
                style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
              >
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
          <span className="truncate text-[14px] text-ink">
            {turns[0]?.text.slice(0, 64)}
          </span>
          <button
            onClick={clear}
            className="shrink-0 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
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
              onRegenerate={
                !busy && i === turns.length - 1 && t.role === "model"
                  ? regenerate
                  : undefined
              }
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={retry} /> : null}
          <div ref={bottom} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-5 pt-3 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <Composer onSend={send} placeholder="Reply…" disabled={busy} />
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-5" />;
}
