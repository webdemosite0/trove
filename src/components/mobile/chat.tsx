"use client";

import * as React from "react";
import Link from "next/link";
import {
  FiArrowRight,
  TbFileText,
  TbPalette,
  TbSearch,
  TbSparkles,
  TbPlugConnected,
} from "@/components/ui/icons";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/hooks/use-chat-thread";
import { useNav } from "@/components/shell/nav-state";
import type { Recent } from "@/lib/recents";
import { FailureNote } from "@/components/ui/failure-note";
import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

const PROMPTS = [
  { label: "Build", prompt: "Build a polished landing page for ", icon: TbPalette, tone: "violet" },
  { label: "Write", prompt: "Write a clear professional ", icon: TbFileText, tone: "sky" },
  { label: "Research", prompt: "Research and summarize ", icon: TbSearch, tone: "emerald" },
] as const;

/**
 * Mobile chat — no project picker, no local folder workspace.
 * Same core chat as desktop, tuned for phone chrome.
 */
export function MobileChat({
  restored = null,
  name = "there",
  activity: initialActivity = [],
  draft: initialDraft = "",
}: {
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
  /** @deprecated ignored on mobile */
  projects?: unknown;
  /** @deprecated ignored on mobile */
  initialProjectId?: string | null;
}) {
  const [mode, setMode] = React.useState<ModeId>(DEFAULT_MODE);
  const [draft, setDraft] = React.useState(initialDraft);
  const { openSettings } = useNav();
  const [activity, setActivity] = React.useState<Recent[]>(initialActivity);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!initialActivity.length) {
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
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialActivity.length]);

  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({
    restored,
    mode,
    projectId: null,
    localProject: null,
  });

  const composerProps = {
    mode,
    onModeChange: setMode,
  };

  if (turns.length === 0) {
    return (
      <div className="mobile-chat flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-3.5 pb-6 pt-[clamp(20px,5vh,48px)] sm:px-4">
          <div className="nx-rise flex flex-col items-center text-center">
            <div className="relative grid size-14 place-items-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 blur-xl"
              />
              <span className="relative grid size-12 place-items-center rounded-[18px] border border-line-strong bg-raised/90 shadow-[var(--sh-2)]">
                <TroveOrb size={29} />
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(1.45rem,1.2rem+1.5vw,1.75rem)] font-semibold tracking-[-0.04em] text-ink">
              What can I help with?
            </h1>
            <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-ink-4">
              Hi {name}. Ask anything, or connect tools from Plugins.
            </p>
          </div>

          <div className="nx-rise mt-6" style={{ animationDelay: "55ms" }}>
            <MobileComposer
              onSend={send}
              disabled={busy}
              {...composerProps}
              key={draft}
              initialValue={draft}
              placeholder="Message Trove…"
              autoFocus={false}
            />
          </div>

          {error ? <Problem message={error} onRetry={retry} /> : null}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setDraft(item.prompt)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-raised/75 px-3.5 text-[12px] font-medium text-ink-2 shadow-[var(--sh-1)] transition active:scale-95",
                  item.tone === "violet" && "active:bg-violet-500/10",
                  item.tone === "sky" && "active:bg-sky-500/10",
                  item.tone === "emerald" && "active:bg-emerald-500/10",
                )}
              >
                <item.icon size={14} className="text-accent" />
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => openSettings("integrations")}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/8 px-3.5 text-[12px] font-medium text-ink-2 transition active:scale-95"
            >
              <TbPlugConnected size={14} className="text-accent" />
              Plugins
            </button>
          </div>

          {activity.length ? (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-4">
                  Recent
                </h2>
                <Link href="/dashboard" className="text-[11px] font-medium text-accent">
                  Home
                </Link>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-line bg-raised/70 shadow-[var(--sh-1)]">
                {activity.slice(0, 6).map((recent, index) => (
                  <Link
                    key={`${recent.kind}-${recent.href}-${recent.title}`}
                    href={recent.href}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition active:bg-hover",
                      index > 0 && "border-t border-line/70",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/10 to-sky-500/10 text-accent">
                      <TbSparkles size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-2">
                      {recent.title}
                    </span>
                    <FiArrowRight size={13} className="shrink-0 text-ink-4" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-chat flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-line/45 px-3 py-1.5">
        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded-full px-3 py-2 text-[11.5px] font-medium text-ink-3 transition active:bg-hover active:text-ink"
        >
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-4 pt-3 sm:px-4">
        <div className="mx-auto max-w-[640px] space-y-4">
          {turns.map((turn, index) => (
            <Message
              key={turn.id}
              role={turn.role}
              text={turn.text}
              files={turn.files}
              pending={busy && index === turns.length - 1 && turn.role === "model"}
            />
          ))}
          {error ? <Problem message={error} onRetry={retry} /> : null}
          <div ref={bottom} className="h-px" aria-hidden />
        </div>
      </div>

      <div
        className="mobile-composer-dock shrink-0 border-t border-line/55 bg-canvas/92 px-2.5 pt-2 backdrop-blur-2xl sm:px-3"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-[640px]">
          <MobileComposer
            onSend={send}
            disabled={busy}
            placeholder="Message Trove…"
            {...composerProps}
          />
        </div>
      </div>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-4" compact />;
}
