"use client";

import { useEffect, useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/hooks/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import type { Recent } from "@/lib/recents";
import { ConnectToolsCard } from "@/components/chat/connect-tools-card";

export function HomeChat({
  restored = null,
  name = "there",
  activity: initialActivity = [],
  draft: initialDraft = "",
}: {
  restored?: {
    id: string;
    title?: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
}) {
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [draft, setDraft] = useState(initialDraft);
  const [activity, setActivity] = useState<Recent[]>(initialActivity);

  useEffect(() => {
    if (initialActivity.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/shell-meta?only=recents", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) =>
          res.ok ? ((await res.json()) as { recents?: Recent[] }) : null,
        )
        .then((data) => {
          if (data?.recents) setActivity(data.recents);
        })
        .catch(() => null);
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialActivity.length]);

  const { turns, busy, error, send, stop, retry, regenerate, continueReply, clear, bottom } =
    useChatThread({
      restored,
      mode,
    });

  const composerProps = {
    mode,
    onModeChange: setMode,
  };

  if (turns.length === 0) {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.1), transparent 60%), radial-gradient(ellipse 30% 24% at 90% 30%, rgba(244,114,182,0.06), transparent 55%)",
          }}
        />
        <div className="relative z-[1] flex flex-1 flex-col items-center px-5 pb-14 pt-[6vh] lg:pt-[9vh]">
          <div className="w-full max-w-[720px] text-center">
            <div className="nx-rise">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-sky-500/10 px-3 py-1 text-[12px] font-medium text-violet-300">
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
              className="nx-rise mt-8"
              style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
            >
              <Composer
                onSend={send}
                initialValue={draft}
                placeholder="Ask anything, or describe what to create…"
                autoFocus
                busy={busy}
                onStop={stop}
                {...composerProps}
              />
            </div>

            <StarterCards className="mt-6" onPick={setDraft} />
            <div className="mt-6">
              <ConnectToolsCard />
            </div>

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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(99,102,241,0.07), transparent 65%)",
        }}
      />
      <header className="relative z-20 shrink-0 border-b border-line/70 bg-canvas/80 px-5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex h-14 max-w-[760px] items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-2">{turns[0]?.text.slice(0, 64)}</p>
          <button
            type="button"
            onClick={clear}
            className="hover-glow shrink-0 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-6 [scrollbar-gutter:stable] lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-6">
          {turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              files={t.files}
              generatingImage={t.generatingImage}
              imageCaption={t.imageCaption}
              thinkMs={t.thinkMs}
              searchQuery={t.searchQuery}
              searchSources={t.searchSources}
              pending={busy && i === turns.length - 1 && t.role === "model"}
              truncated={t.truncated === true}
              onRegenerate={
                !busy && i === turns.length - 1 && t.role === "model"
                  ? regenerate
                  : undefined
              }
              onContinue={
                !busy && i === turns.length - 1 && t.role === "model" && t.truncated
                  ? () => continueReply(t.id)
                  : undefined
              }
              onRetry={
                !busy && i === turns.length - 1 && t.role === "model" && t.truncated
                  ? regenerate
                  : undefined
              }
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={retry} /> : null}
          <div ref={bottom} className="h-px w-full shrink-0" aria-hidden />
        </div>
      </div>

      <div className="relative shrink-0 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-5 pb-5 pt-6 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <Composer onSend={send} placeholder="Reply…" busy={busy} onStop={stop} compact {...composerProps} />
          <p className="mt-2.5 text-center text-[11.5px] text-ink-4">
            Trove can make mistakes. Check important info.
          </p>
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
