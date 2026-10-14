"use client";

import { useRestoredBrief } from "@/lib/use-restored-brief";
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
  useRestoredBrief({ initial: initialDraft, enabled: !restored, onRestore: setDraft });
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
      <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Lovable-style home: the sunset gradient with one big prompt. */}
        <section className="lv-hero lv-hero--compact shrink-0 px-5 pb-16 pt-[9vh] text-white lg:pb-20 lg:pt-[13vh]">
          <div className="relative z-[1] mx-auto w-full max-w-[720px] text-center">
            <div className="nx-rise">
              <div className="[&_*]:!text-white/75">
                <Greeting name={name} />
              </div>
              <h1 className="mt-2 text-[clamp(2rem,1.3rem+2.2vw,3.1rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
                Ready to build, {name.split(" ")[0]}?
              </h1>
              <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-white/75">
                Describe the work. Trove builds the file: a doc, a sheet, a deck or a site.
              </p>
            </div>

            <div
              className="nx-rise mt-8 text-left"
              style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
            >
              <Composer
                key={draft ? "brief" : "empty"}
                onSend={send}
                initialValue={draft}
                placeholder="Ask Trove to create…"
                autoFocus
                busy={busy}
                onStop={stop}
                {...composerProps}
              />
            </div>
          </div>
          <div aria-hidden className="lv-hero-fade" />
        </section>

        <div className="relative flex flex-1 flex-col items-center px-5 pb-14">
          <div className="relative z-[1] w-full max-w-[720px] text-center">
            <StarterCards className="mt-2" onPick={setDraft} />
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
      <header className="relative z-20 shrink-0 border-b border-line bg-canvas px-5 lg:px-8">
        <div className="mx-auto flex h-12 max-w-[760px] items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-2">{turns[0]?.text.slice(0, 64)}</p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-[var(--r-control)] border border-line bg-raised px-3 py-1 text-[13px] font-medium text-ink-2 shadow-[var(--shadow-sm)] transition-colors hover:bg-hover hover:text-ink"
          >
            New chat
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

      <div className="relative shrink-0 bg-canvas px-5 pb-4 pt-3 lg:px-8">
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
  return <FailureNote error={message} onRetry={onRetry} variant="centered" className="mt-5" />;
}
