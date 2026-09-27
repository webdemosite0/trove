"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiDownload,
  FiRotateCcw,
  FiFileText,
  FiCopy,
  FiCheck,
  FiPrinter,
} from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import type { Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useDraft } from "@/lib/use-draft";
import { downloadDocx, downloadMarkdown } from "@/lib/export";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "An onboarding guide for a new backend engineer",
  "A postmortem template for production incidents",
  "API documentation for a payments endpoint",
];

export function DocumentView({
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  recents?: Recent[];
  recentsLabel?: string;
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
}) {
  const { turns, busy, error, latest: text, prompt, ask, startOver } = useDraft({
    tool: "docs",
    restored,
  });
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const articleRef = useRef<HTMLElement>(null);
  const [outline, setOutline] = useState<
    { id: string; text: string; level: number }[]
  >([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, minutes: Math.max(1, Math.round(words / 220)) };
  }, [text]);

  useEffect(() => {
    const el = articleRef.current;
    if (!el || !text) {
      setOutline([]);
      return;
    }
    const found = [...el.querySelectorAll("h1, h2, h3")].map((h, i) => {
      const label = (h.textContent || "").trim();
      const id = `s-${i}-${label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)}`;
      h.id = id;
      return { id, text: label, level: Number(h.tagName[1]) };
    });
    setOutline(found.filter((f) => f.text));
  }, [text]);

  useEffect(() => {
    if (!outline.length) return;
    const pick = () => {
      const marker = 96;
      let current = outline[0].id;
      for (const o of outline) {
        const el = document.getElementById(o.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top > marker) break;
        current = o.id;
      }
      setActiveId(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [outline]);

  function run(value: string, attachments?: Attachment[]) {
    void ask(value, { attachments });
    // After first message, prefer chat panel on mobile so the user can iterate
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setShowPreview(false);
    }
  }

  const filename =
    (text.match(/^#\s+(.+)$/m)?.[1] ?? prompt ?? "document")
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "document";

  if (turns.length === 0) {
    return (
      <div className="nx-in relative mx-auto flex min-h-[70dvh] max-w-[760px] flex-col justify-center px-4 py-12 sm:px-5 sm:py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-panel)] bg-accent/15 text-accent">
            <Ico icon={FiFileText} motion="lift" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Documents</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Chat on the left. Live document on the right — export to Word anytime.
          </p>
        </div>

        <Composer onSend={run} placeholder="Write a document about…" autoFocus />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e, i) => (
            <button
              key={e}
              type="button"
              onClick={() => run(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        <Recents
          className="mt-10"
          label={recentsLabel}
          items={recents}
          onPick={run}
          manage
          emptyHint="Nothing saved yet. What you make here is kept, so you can reopen it and keep working."
        />
      </div>
    );
  }

  /* Split workspace: Chat | Preview (desktop side-by-side; mobile bottom tabs) */
  return (
    <div className="mobile-editor doc-editor flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      <nav aria-label="Document view" className="mobile-editor-tabs lg:hidden">
        <button
          type="button"
          aria-pressed={!showPreview}
          onClick={() => setShowPreview(false)}
        >
          Chat
        </button>
        <button
          type="button"
          aria-pressed={showPreview}
          onClick={() => setShowPreview(true)}
        >
          Preview
        </button>
      </nav>

      {/* Chat panel — left on desktop */}
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col border-b border-line lg:max-w-[420px] lg:border-b-0 lg:border-r",
          showPreview ? "hidden lg:flex" : "flex",
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-4">Documents</p>
            <h1 className="truncate text-[14px] font-semibold text-ink">{prompt || "Document"}</h1>
          </div>
          <button
            type="button"
            onClick={startOver}
            className="chip group !px-2.5 !py-1.5 !text-[12px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {turns.map((t) =>
            t.role === "user" ? (
              <div key={t.id} className="flex justify-end">
                <p className="max-w-[90%] rounded-[18px] rounded-br-md bg-accent/15 px-3.5 py-2 text-[14px] text-ink">
                  {t.text}
                </p>
              </div>
            ) : (
              <div key={t.id} className="space-y-3">
                {t.text === text && text ? (
                  <div className="flex items-center gap-3 rounded-[16px] border border-line bg-raised/80 p-3 shadow-sm">
                    <span className="grid size-11 place-items-center rounded-[12px] bg-accent/15 text-accent">
                      <FiFileText size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {filename}.docx
                      </p>
                      <p className="text-[12px] text-ink-4">
                        {stats.words.toLocaleString()} words · Preview file
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="rounded-full border border-line bg-sunk px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-hover lg:hidden"
                    >
                      Preview
                    </button>
                  </div>
                ) : null}
                {!t.text && busy ? (
                  <div className="flex items-center gap-3">
                    <Bot size={32} state="working" />
                    <span className="nx-dots text-[14px] text-ink-2">Writing</span>
                  </div>
                ) : null}
              </div>
            ),
          )}
          {error ? (
            <FailureNote error={error} onRetry={() => run(prompt)} />
          ) : null}
        </div>

        <div className="mobile-composer-dock shrink-0 border-t border-line bg-canvas/90 p-3 backdrop-blur">
          <Composer
            onSend={run}
            disabled={busy}
            placeholder="Update this document…"
            compact
          />
        </div>
      </div>

      {/* Preview panel — right on desktop */}
      {showPreview ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <div className="nx-no-print flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full text-ink-3 hover:bg-hover lg:hidden"
              onClick={() => setShowPreview(false)}
              aria-label="Back to chat"
            >
              ←
            </button>
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
              {filename}.docx
            </p>
            <button
              type="button"
              onClick={() => downloadDocx(text, `${filename}.docx`)}
              disabled={!text || busy}
              className="chip group !px-2.5 !py-1.5 !text-[12px] disabled:opacity-40"
            >
              <Ico icon={FiDownload} motion="lift" size={13} /> Word
            </button>
            <button
              type="button"
              onClick={() => downloadMarkdown(text, `${filename}.md`)}
              disabled={!text || busy}
              className="chip group !hidden !px-2.5 !py-1.5 !text-[12px] disabled:opacity-40 sm:!inline-flex"
            >
              MD
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!text || busy}
              className="chip group !hidden !px-2.5 !py-1.5 !text-[12px] disabled:opacity-40 sm:!inline-flex"
              title="Print or save as PDF"
            >
              <Ico icon={FiPrinter} motion="lift" size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              disabled={!text}
              className="chip group !px-2.5 !py-1.5 !text-[12px] disabled:opacity-40"
            >
              {copied ? (
                <Ico icon={FiCheck} motion="check" size={13} className="text-positive" />
              ) : (
                <Ico icon={FiCopy} motion="nudge" size={13} />
              )}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto grid max-w-[980px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_180px] lg:px-6 lg:py-8">
              <div className="min-w-0">
                {busy && !text ? (
                  <div className="panel flex items-center gap-3.5 px-5 py-4">
                    <Bot size={38} state="working" />
                    <span className="nx-dots text-[14px] text-ink-2">Writing</span>
                  </div>
                ) : null}

                {text ? (
                  <article
                    ref={articleRef}
                    className="nx-doc panel mx-auto max-w-[860px] px-6 py-8 sm:px-10 sm:py-11"
                  >
                    <Message role="model" text={text} pending={busy} />
                  </article>
                ) : (
                  <div className="py-16 text-center text-[13px] text-ink-4">
                    Document appears when writing is ready.
                  </div>
                )}
              </div>

              {outline.length > 2 ? (
                <aside className="nx-no-print order-first hidden lg:order-none lg:block">
                  <div className="sticky top-6">
                    <p className="mb-3 text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
                      On this page
                    </p>
                    <nav className="space-y-0.5 border-l border-line">
                      {outline.map((o) => (
                        <a
                          key={o.id}
                          href={`#${o.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document
                              .getElementById(o.id)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={cn(
                            "-ml-px block border-l-2 py-1 text-[12.5px] leading-snug transition-colors",
                            o.level === 3 ? "pl-6" : "pl-3.5",
                            activeId === o.id
                              ? "border-accent text-ink"
                              : "border-transparent text-ink-3 hover:text-ink-2",
                          )}
                        >
                          {o.text}
                        </a>
                      ))}
                    </nav>
                    <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-4">
                      {stats.words.toLocaleString()} words · {stats.minutes} min read
                    </p>
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
