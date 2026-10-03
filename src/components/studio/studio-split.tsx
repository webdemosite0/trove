"use client";

import { useState } from "react";
import { Thinking } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";

/**
 * Split-view studio layout: preview on the left, chat + customize on the right.
 * Used inside all create pages (docs, sheets, slides, design, websites).
 */
export function StudioSplit({
  preview,
  onPrompt,
  suggestions = [],
  customize,
  title,
}: {
  /** The live preview / editor rendered on the left */
  preview: React.ReactNode;
  /** Called with the user's prompt; should return a promise */
  onPrompt: (prompt: string) => Promise<void>;
  suggestions?: string[];
  /** Customization controls rendered above the chat in the right panel */
  customize?: React.ReactNode;
  title: string;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  async function submit(q: string) {
    const prompt = q.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setValue("");
    try {
      await onPrompt(prompt);
      setMessages((m) => [...m, { role: "ai", text: "Done — preview updated." }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas lg:flex-row">
      {/* Left: preview */}
      <div className="min-h-0 flex-1 overflow-hidden border-b border-line lg:border-b-0 lg:border-r">
        {preview}
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
          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className="border-t border-line p-3"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-sunk p-1.5 focus-within:border-accent/50">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Describe what to create or change…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(value);
                }
              }}
              className="flex-1 resize-none bg-transparent px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!value.trim() || busy}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
