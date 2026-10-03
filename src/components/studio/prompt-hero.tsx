"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Thinking } from "@/components/chat/thinking";

/**
 * AI-first homepage hero: just a chat box, centered.
 * Used by all studio create pages (docs, sheets, slides, design, websites).
 */
export function PromptHero({
  title,
  placeholder,
  suggestions,
  action,
  libraryHref,
  libraryLabel,
}: {
  title: string;
  placeholder: string;
  suggestions: string[];
  /** Where to go with the prompt, e.g. (q) => `/documents/new?q=${encodeURIComponent(q)}` */
  action: (q: string) => string;
  libraryHref: string;
  libraryLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(q: string) {
    const prompt = q.trim();
    if (!prompt || busy) return;
    setBusy(true);
    router.push(action(prompt));
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
            {title}
          </h1>

          {/* Chat box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
            className="mt-6"
          >
            <div className="rounded-[20px] border border-line bg-raised p-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition focus-within:border-accent/50">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(value);
                  }
                }}
                className="w-full resize-none bg-transparent px-4 pt-3 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="px-2 text-[12px] text-ink-4">
                  {busy ? "Starting…" : "Enter to generate"}
                </span>
                <button
                  type="submit"
                  disabled={!value.trim() || busy}
                  className="flex size-10 items-center justify-center rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
                  aria-label="Generate"
                >
                  {busy ? (
                    <Thinking size={18} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Suggestion chips */}
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

      {/* Subtle library link */}
      <div className="flex justify-center pb-6">
        <button
          onClick={() => router.push(libraryHref)}
          className="text-[13px] text-ink-4 transition hover:text-ink-2"
        >
          {libraryLabel} →
        </button>
      </div>
    </div>
  );
}
