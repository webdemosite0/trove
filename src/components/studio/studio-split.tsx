"use client";

import { useState } from "react";
import { Composer } from "@/components/chat/composer";
import { Thinking } from "@/components/chat/thinking";
import { FiRefreshCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { StudioGenResult } from "@/lib/studio-events";

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
  enableRetry = false,
}: {
  /** The live preview / editor rendered on the right (after generation) */
  preview: React.ReactNode;
  /**
   * Called with the user's prompt. Must resolve with a StudioGenResult that
   * truthfully reports whether content was generated AND applied — the
   * sidebar only says "Done" when the editor confirms it (QA-01).
   */
  onPrompt: (prompt: string) => Promise<StudioGenResult>;
  suggestions?: string[];
  /** Customization controls rendered above the chat in the left panel */
  customize?: React.ReactNode;
  title: string;
  placeholder?: string;
  /** Whether content already exists */
  hasContent?: boolean;
  emptyMessage?: string;
  /**
   * Show a prominent "Retry" button on failed generations (timeout/error)
   * that re-submits the prompt that failed — no retyping needed. Opt-in so
   * studios own their own failure UX (the Documents studio opts in separately).
   */
  enableRetry?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(hasContent);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string; failedPrompt?: string; details?: string }[]
  >([]);
  // R-01: on phones, default to the editor with the AI panel behind a tab,
  // so the chat doesn't eat half the screen.
  const [mobileTab, setMobileTab] = useState<"editor" | "chat">("editor");

  async function submit(prompt: string) {
    const q = prompt.trim();
    if (!q || busy) return;
    setBusy(true);
    if (!started) setStarted(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const result = await onPrompt(q);
      // QA-01: only claim success when the editor confirms the content was
      // actually generated and applied. Anything else gets a real message.
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: result.ok
            ? result.stale
              ? "Generated, but you edited the preview meanwhile — review it there and apply it if you want it."
              : result.applied
                ? "Done — preview updated." +
                  (result.warning ? ` Note: ${result.warning}` : "")
                : "Generated, but it wasn't applied to the preview. Check the preview and try again if needed."
            : `Couldn't do that: ${result.error} Try again or rephrase.`,
          // P1: failed (timeout/error) results carry their originating prompt
          // so the sidebar can offer a direct Retry without retyping.
          failedPrompt: result.ok ? undefined : q,
          // Defect 2: pass through the editor's diagnostic breadcrumb so a
          // failure can be traced from the chat command to editor execution.
          details: result.ok ? undefined : result.details,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Something went wrong. Try again.", failedPrompt: q }]);
    } finally {
      setBusy(false);
    }
  }

  /** Re-submit the prompt that failed (direct retry — no retyping). */
  function retry(failedPrompt: string) {
    if (busy) return;
    void submit(failedPrompt);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas lg:flex-row">
      {/* Mobile tab bar: Editor | AI Chat */}
      <div className="flex shrink-0 gap-1 border-b border-line bg-raised p-2 lg:hidden" role="tablist" aria-label="Studio view">
        {(["editor", "chat"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={mobileTab === t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-[14px] font-medium transition",
              mobileTab === t
                ? "bg-accent/15 text-ink"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {t === "editor" ? "Editor" : "AI Chat"}
            {t === "chat" && busy ? " ···" : null}
          </button>
        ))}
      </div>

      {/* Left: chat + customize (single chat) */}
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col bg-raised lg:h-full lg:w-[380px] lg:shrink-0 lg:border-r lg:border-line",
          mobileTab === "chat" ? "flex" : "hidden lg:flex",
        )}
      >
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
                {/* Defect 2: show the editor's diagnostic breadcrumb under
                    the error so failures are traceable to the request. */}
                {m.role === "ai" && m.details ? (
                  <p className="mt-1.5 break-all font-mono text-[10.5px] leading-relaxed text-ink-4/80">
                    {m.details}
                  </p>
                ) : null}
                {/* P1: direct retry on failed generations — the button sits
                    right under the error text, visible without scrolling. */}
                {enableRetry && m.role === "ai" && m.failedPrompt ? (
                  <button
                    type="button"
                    onClick={() => m.failedPrompt && retry(m.failedPrompt)}
                    disabled={busy}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  >
                    <FiRefreshCw size={13} />
                    Retry
                  </button>
                ) : null}
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
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden",
          mobileTab === "editor" ? "flex flex-col" : "hidden lg:flex lg:flex-col",
        )}
      >
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
