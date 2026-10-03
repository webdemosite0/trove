"use client";

import { useState } from "react";
import { Composer } from "@/components/chat/composer";
import { Thinking } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";

/**
 * Studio layout with three states:
 * 1. Empty: centered chat box (like the homepage)
 * 2. Generating: loading animation
 * 3. Done: split view — preview left, chat + customize right
 *
 * Uses the real chat Composer for an identical chat experience.
 */
export function StudioSplit({
  preview,
  emptyPreview,
  onPrompt,
  suggestions = [],
  customize,
  title,
  placeholder,
  hasContent = false,
}: {
  /** The live preview / editor rendered on the left (after generation) */
  preview: React.ReactNode;
  /** Shown in the center before anything is generated */
  emptyPreview?: React.ReactNode;
  /** Called with the user's prompt; should return a promise */
  onPrompt: (prompt: string) => Promise<void>;
  suggestions?: string[];
  /** Customization controls rendered above the chat in the right panel */
  customize?: React.ReactNode;
  title: string;
  placeholder?: string;
  /** Whether content exists (controls empty vs split view) */
  hasContent?: boolean;
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

  // State 1: Empty — centered chat
  if (!started) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-canvas px-5">
        <div className="w-full max-w-2xl">
          {emptyPreview ?? (
            <div className="mb-6 flex justify-center">
              <Thinking size={72} />
            </div>
          )}
          <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
            {title}
          </h1>
          <div className="mt-6">
            <Composer
              onSend={(v) => submit(v)}
              placeholder={placeholder ?? "Describe what to create…"}
              autoFocus
              busy={busy}
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full border border-line bg-raised px-4 py-2 text-[13px] text-ink-2 transition hover:border-accent/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // State 2 & 3: Split view (generating shows loading in preview)
  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas lg:flex-row">
      {/* Left: preview */}
      <div className="relative min-h-0 flex-1 overflow-hidden border-b border-line lg:border-b-0 lg:border-r">
        {preview}
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-canvas/80 backdrop-blur-sm">
            <Thinking size={64} />
            <p className="mt-4 text-[15px] font-medium text-ink-2">Creating…</p>
          </div>
        )}
      </div>

      {/* Right: chat + customize */}
      <div className="flex h-[45%] w-full flex-col bg-raised lg:h-full lg:w-[380px] lg:shrink-0">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        </div>

        {customize ? (
          <div className="border-b border-line px-4 py-3">{customize}</div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => (
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
          ))}
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
            placeholder="Describe what to create or change…"
            compact
            busy={busy}
            allowAttachments={false}
          />
        </div>
      </div>
    </div>
  );
}
