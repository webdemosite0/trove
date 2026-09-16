"use client";

import * as React from "react";
import Link from "next/link";
import type { IconType } from "@/components/ui/icons";
import { TbWorld, TbRobot, TbFileText, TbTable, TbPresentation, TbPalette, TbCode, TbSearch } from "@/components/ui/icons";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { Wordmark } from "@/components/brand/logo";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { DEFAULT_CHAT_MODEL, type ChatModelId, type ChatModelOption } from "@/lib/chat-models";
import { useChatThread } from "@/lib/use-chat-thread";
import type { Recent } from "@/lib/recents";
import { FailureNote } from "@/components/ui/failure-note";
import { StarterCards } from "@/components/home/starter-cards";

const TOOLS: { href: string; label: string; icon: IconType }[] = [
  { href: "/websites", label: "Websites", icon: TbWorld },
  { href: "/agents", label: "Agents", icon: TbRobot },
  { href: "/documents", label: "Docs", icon: TbFileText },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable },
  { href: "/slides", label: "Slides", icon: TbPresentation },
  { href: "/code", label: "Code", icon: TbCode },
  { href: "/design", label: "Design", icon: TbPalette },
  { href: "/research", label: "Research", icon: TbSearch },
];

export function MobileChat({
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
  const [mode, setMode] = React.useState<ModeId>(DEFAULT_MODE);
  const [model, setModel] = React.useState<ChatModelId>(
    models.some((option) => option.id === DEFAULT_CHAT_MODEL) ? DEFAULT_CHAT_MODEL : (models[0]?.id ?? DEFAULT_CHAT_MODEL),
  );
  const [draft, setDraft] = React.useState(initialDraft);
  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({ restored, mode, model });

  const composerModelProps = { model, modelOptions: models, onModelChange: setModel, mode, onModeChange: setMode };

  if (turns.length === 0) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-3.5 pb-8 sm:px-4">
        <div className="nx-rise flex flex-col items-center pb-5 pt-7 sm:pb-7 sm:pt-10">
          <Wordmark size={30} sweep={false} />
          <p className="mt-2 text-center text-[11.5px] text-ink-3 sm:text-[13px]">
            Hi {name} — describe the work. Trove builds it.
          </p>
        </div>

        <div className="nx-rise-slow">
          <MobileComposer onSend={send} disabled={busy} {...composerModelProps} key={draft} initialValue={draft} />
        </div>

        {error ? <Problem message={error} onRetry={retry} /> : null}

        <div className="nx-rise-slow -mx-3.5 mt-3 sm:-mx-4">
          <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-1 scrollbar-none sm:px-4">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-[11.5px] text-ink-2 transition-colors hover:bg-hover"
              >
                <t.icon size={14} className="shrink-0 text-ink" />
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        <MiniChartCard />

        {activity.length === 0 ? <StarterCards className="mt-5" onPick={setDraft} /> : null}

        {activity.length ? (
          <div className="mt-5">
            <h2 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Recent</h2>
            <ul className="nx-stagger space-y-0.5">
              {activity.slice(0, 6).map((r) => (
                <li key={`${r.kind}-${r.href}-${r.title}`}>
                  <Link href={r.href} className="block truncate rounded-[14px] px-3 py-2 text-[12.5px] text-ink-2 transition-colors hover:bg-hover">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line/60 px-3.5 py-2.5 sm:px-4">
        <span className="min-w-0 truncate text-[11.5px] font-medium text-ink-3 sm:text-[12.5px]">{turns[0]?.text.slice(0, 48)}</span>
        <button type="button" onClick={clear} className="press shrink-0 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-medium text-ink-2 transition-colors hover:bg-hover">
          New
        </button>
      </div>

      <div className="flex-1 space-y-4 px-3.5 pb-3 pt-3 sm:px-4">
        {turns.map((t, i) => (
          <Message key={t.id} role={t.role} text={t.text} files={t.files} pending={busy && i === turns.length - 1 && t.role === "model"} />
        ))}
        {error ? <Problem message={error} onRetry={retry} /> : null}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas/98 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        <MobileComposer onSend={send} disabled={busy} placeholder="Reply…" {...composerModelProps} />
      </div>
    </div>
  );
}

function MiniChartCard() {
  return (
    <div className="nx-rise-slow mt-5 rounded-[18px] border border-line/80 bg-raised/90 p-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">Example output</p>
          <h3 className="mt-1 text-[12.5px] font-semibold text-ink">Revenue dashboard</h3>
        </div>
        <span className="rounded-full bg-positive/10 px-2 py-1 text-[9.5px] font-semibold text-positive">Live</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[["$24.5K", "+12%"], ["1,429", "+8%"], ["2.1%", "-0.5%"]].map(([value, delta]) => (
          <div key={value} className="rounded-xl border border-line/70 bg-sunk/40 px-2 py-2">
            <div className="text-[12px] font-semibold tabular-nums text-ink">{value}</div>
            <div className={cn("mt-0.5 text-[9px]", delta.startsWith("-") ? "text-critical" : "text-positive")}>{delta}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-[72px] overflow-hidden rounded-xl border border-line/70 bg-gradient-to-b from-violet-50/70 to-white">
        <svg viewBox="0 0 320 72" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,56 C30,47 42,49 68,39 C92,30 112,42 137,33 C166,22 182,30 207,21 C238,10 263,20 320,8 L320,72 L0,72 Z" fill="url(#chart-fill)" />
          <path d="M0,56 C30,47 42,49 68,39 C92,30 112,42 137,33 C166,22 182,30 207,21 C238,10 263,20 320,8" fill="none" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-4" compact />;
}
