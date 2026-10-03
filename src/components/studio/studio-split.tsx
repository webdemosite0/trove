"use client";

import { useState } from "react";
import { Composer } from "@/components/chat/composer";
import { Thinking } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";

/**
 * Studio layout: chat on the left, preview on the right.
 * Single chat throughout — empty state, generating, and done all
 * share the same left chat panel.
 */
export function StudioSplit({
  preview,
  onPrompt,
  suggestions = [],
  customize,
  title,
  placeholder,
  hasContent = false,
  emptyMessage = "Describe what to create — the preview will appear here.",
}: {
  /** The live preview / editor rendered on the right (after generation) */
  preview: React.ReactNode;
  /** Called with the user's prompt; should return a promise */
  onPrompt: (prompt: string) => Promise<void>;
  suggestions?: string[];
  /** Customization controls rendered above the chat in the left panel */
  customize?: React.ReactNode;
  title: string;
  placeholder?: string;
  /** Whether content already exists */
  hasContent?: boolean;
  emptyMessage?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(hasContent);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  async function submit(prompt: string) {
    const q = prompt.trim();
    if (!q || busy) return;
    setBusy(true);
    if (!started) setStarted(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      await onPrompt(q);
      setMessages((m) => [...m, { role: "ai", text: "Done — preview updated." }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas lg:flex-row">
      {/* Left: chat + customize (single chat) */}
      <div className="flex h-[45%] w-full flex-col bg-raised lg:h-full lg:w-[380px] lg:shrink-0 lg:border-r lg:border-line">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        </div>

        {customize ? (
          <div className="border-b border-line px-4 py-3">{customize}</div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-6 text-center">
<div className="grid size-12 place-items-center rounded-full bg-accent/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
                  <path d="M12 3v3m0 12v3m-9-9h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="3.5"/>
                </svg>
              </div>
              <p className="mt-3 max-w-[240px] text-[13px] leading-relaxed text-ink-3">
                {emptyMessage}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-line bg-sunk px-3 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-accent text-white"
                    : "bg-sunk text-ink-2",
                )}
              >
                {m.text}
              </div>
            ))
          )}
          {busy && (
            <div className="flex items-center gap-2 px-1">
              <Thinking size={20} />
              <span className="text-[13px] text-ink-3">Working…</span>
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <Composer
            onSend={(v) => submit(v)}
            placeholder={placeholder ?? "Describe what to create or change…"}
            compact
            busy={busy}
            allowAttachments={false}
          />
        </div>
      </div>

      {/* Right: preview */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!started ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
<div className="grid size-16 place-items-center rounded-full bg-accent/10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
                  <path d="M12 3v3m0 12v3m-9-9h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="3.5"/>
                </svg>
              </div>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-3">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <>
            {preview}
            {busy && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-canvas/80 backdrop-blur-sm">
                <Thinking size={64} />
                <p className="mt-4 text-[15px] font-medium text-ink-2">Creating…</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
