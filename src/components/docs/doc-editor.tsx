"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Thinking } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";
import type { Doc } from "@/lib/documents";
import type { StudioGenResult } from "@/lib/studio-events";

type SaveState = "idle" | "saving" | "saved" | "error";

/** Notify the studio chat panel how generation ended (QA-01). */
function finishDocs(result: StudioGenResult) {
  window.dispatchEvent(
    new CustomEvent<StudioGenResult>("docs-ai-finished", { detail: result }),
  );
}

/** Notion-style document editor: title, rich text, autosave, AI drafting. */
export function DocEditor({ initial }: { initial: Doc | null }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [words, setWords] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const idRef = useRef<string | null>(initial?.id ?? null);
  const titleRef = useRef(title);
  titleRef.current = title;

  // Load initial content once.
  useEffect(() => {
    if (bodyRef.current && initial?.content) {
      bodyRef.current.innerHTML = initial.content;
      updateWordCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for external AI prompts from the studio chat panel (StudioSplit).
  // Detail: { prompt: string; rewrite?: boolean; tone?: string }.
  useEffect(() => {
    function onExternalPrompt(e: Event) {
      const detail = (e as CustomEvent<{ prompt: string; rewrite?: boolean; tone?: string; reqId?: string }>).detail;
      if (!detail) return;
      const reqId = detail.reqId ?? null;
      let prompt = detail.prompt;
      if (detail.rewrite) {
        const html = bodyRef.current?.innerHTML?.trim() ?? "";
        const tone = detail.tone ?? "clear";
        prompt = html
          ? `Rewrite the following document in a ${tone} tone. Return ONLY the rewritten document content as clean HTML (use <h2>, <p>, <ul>/<li>, <strong>, <em> tags — no <html>/<body> wrapper, no markdown fences, no commentary):\n\n${html}`
          : `Write a short sample document in a ${tone} tone. Return ONLY the document content as clean HTML (use <h2>, <p>, <ul>/<li>, <strong>, <em> tags — no <html>/<body> wrapper, no markdown fences, no commentary).`;
      }
      if (!prompt.trim()) return;
      setAiPrompt(prompt);
      setAiOpen(true);
      autoInsertRef.current = true; // external trigger: auto-insert on success
      // Defer so state settles before runAi reads it. runAi reports its own
      // outcome via docs-ai-finished (tagged with reqId).
      setTimeout(() => {
        void runAiRef.current?.(reqId);
      }, 50);
    }
    window.addEventListener("docs-ai-prompt", onExternalPrompt);
    return () => window.removeEventListener("docs-ai-prompt", onExternalPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function updateWordCount() {
    const text = bodyRef.current?.innerText ?? "";
    setWords(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
  }

  const persist = useCallback(async () => {
    const html = bodyRef.current?.innerHTML ?? "";
    const t = titleRef.current.trim();
    // Don't create empty docs.
    if (!idRef.current && !t && !bodyRef.current?.innerText?.trim()) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    try {
      if (idRef.current) {
        const res = await fetch(`/api/documents/${encodeURIComponent(idRef.current)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t, content: html }),
        });
        if (!res.ok) throw new Error("Save failed");
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t || "Untitled document", content: html }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        const id = String(data?.document?.id ?? "");
        if (!id) throw new Error("Save failed");
        idRef.current = id;
        setDocId(id);
        router.replace(`/documents/${id}`);
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [router]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      dirtyRef.current = false;
      void persist();
    }, 1500);
  }, [persist]);

  // Flush on unmount.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) void persist();
    };
  }, [persist]);

  function format(cmd: string, value?: string) {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, value);
    scheduleSave();
    updateWordCount();
  }

  function onInput() {
    scheduleSave();
    updateWordCount();
  }

  /** AI drafting: stream from /api/chat, show the Thinking ball until text arrives. */
  const runAiRef = useRef<
    ((reqId?: string | null) => Promise<StudioGenResult>) | null
  >(null);
  // Set by onExternalPrompt: sidebar chat prompts auto-insert on success.
  const autoInsertRef = useRef(false);
  async function runAi(reqId: string | null = null): Promise<StudioGenResult> {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) {
      return {
        ok: false,
        error: "Already writing — wait a moment.",
        reqId: reqId ?? undefined,
      };
    }
    setAiBusy(true);
    setAiError(null);
    setAiResult("");
    const shouldAutoInsert = autoInsertRef.current;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              text: `Write a document based on this request. Return ONLY the document content as clean HTML (use <h2>, <p>, <ul>/<li>, <strong>, <em> tags — no <html>/<body> wrapper, no markdown fences, no commentary):\n\n${prompt}`,
            },
          ],
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Generation failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAiResult(full);
      }
      if (!full.trim()) throw new Error("The AI returned nothing. Try again.");
      // Auto-insert when triggered from the studio chat panel.
      if (shouldAutoInsert) {
        autoInsertRef.current = false;
        // Defer so aiResult state settles, then insert — and only report
        // success AFTER the content actually landed in the document (QA-01).
        setTimeout(() => {
          const el = bodyRef.current;
          if (el && full.trim()) {
            el.innerHTML = full;
            setAiResult("");
            setAiPrompt("");
            setAiOpen(false);
            scheduleSave();
            updateWordCount();
          }
          if (reqId) finishDocs({ ok: true, applied: true, reqId });
        }, 100);
        return { ok: true, applied: true, reqId: reqId ?? undefined };
      }
      if (reqId) finishDocs({ ok: true, applied: false, reqId });
      return { ok: true, applied: false, reqId: reqId ?? undefined };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed.";
      setAiError(message);
      autoInsertRef.current = false;
      // QA-01: a failed generation must surface as a failure, never as "Done".
      const r: StudioGenResult = {
        ok: false,
        error: message,
        reqId: reqId ?? undefined,
      };
      if (reqId) finishDocs(r);
      return r;
    } finally {
      setAiBusy(false);
    }
  }

  runAiRef.current = runAi;

  function insertAi(replace: boolean) {
    if (!aiResult.trim() || !bodyRef.current) return;
    if (replace) {
      bodyRef.current.innerHTML = aiResult;
    } else {
      const sep = bodyRef.current.innerHTML.trim() ? "<p><br></p>" : "";
      bodyRef.current.innerHTML = `${bodyRef.current.innerHTML}${sep}${aiResult}`;
    }
    setAiResult("");
    setAiPrompt("");
    setAiOpen(false);
    scheduleSave();
    updateWordCount();
    bodyRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  const saveLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Save failed — retry";
      default:
        return dirtyRef.current ? "Unsaved" : "Saved";
    }
  }, [saveState]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col bg-canvas">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/documents"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-hover hover:text-ink active:scale-95"
          aria-label="Back to documents"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition active:scale-95",
            aiOpen ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent/15",
          )}
          aria-expanded={aiOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
          AI draft
        </button>
        <div className="min-w-0 flex-1" />
        <span
          className={cn(
            "shrink-0 text-[12.5px] font-medium",
            saveState === "error" ? "text-critical" : "text-ink-4",
          )}
          role="status"
        >
          {saveLabel}
        </span>
        <span className="hidden shrink-0 text-[12.5px] tabular-nums text-ink-4 sm:inline" aria-label="Word count">
          {words} word{words === 1 ? "" : "s"}
        </span>
      </header>

      {/* AI panel */}
      {aiOpen ? (
        <div className="shrink-0 px-4 pb-2 sm:px-6">
          <div className="rounded-3xl border border-accent/25 bg-raised p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void runAi();
                  }
                }}
                placeholder="Write a… (e.g. launch announcement for our app)"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-line/60 bg-canvas px-4 text-[15px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
                aria-label="AI writing prompt"
                disabled={aiBusy}
              />
              <button
                type="button"
                onClick={() => void runAi()}
                disabled={aiBusy || !aiPrompt.trim()}
                className="grid h-12 shrink-0 place-items-center rounded-2xl bg-accent px-5 text-[15px] font-semibold text-white transition active:scale-95 disabled:opacity-50"
              >
                {aiBusy ? "Writing…" : "Write"}
              </button>
            </div>

            {aiBusy && !aiResult ? (
              <div className="px-1 py-5">
                <Thinking label="Writing your draft…" />
              </div>
            ) : null}

            {aiError ? (
              <p className="mt-3 rounded-2xl bg-critical/10 px-4 py-3 text-[13.5px] text-critical">
                {aiError}
              </p>
            ) : null}

            {aiResult ? (
              <div className="mt-3">
                <div
                  className="max-h-56 overflow-y-auto rounded-2xl border border-line/60 bg-canvas p-4 text-[14px] leading-relaxed text-ink [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-[16px] [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: aiResult }}
                />
                <div className="mt-3 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => insertAi(false)}
                    className="grid h-11 flex-1 place-items-center rounded-2xl bg-accent text-[14.5px] font-semibold text-white transition active:scale-95"
                  >
                    Insert into document
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAi(true)}
                    className="grid h-11 flex-1 place-items-center rounded-2xl bg-sunk text-[14.5px] font-semibold text-ink transition active:scale-95"
                  >
                    Replace document
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Title */}
      <div className="shrink-0 px-4 pt-2 sm:px-6">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
          placeholder="Untitled document"
          className="w-full bg-transparent text-[28px] font-bold tracking-tight text-ink placeholder:text-ink-4/60 focus:outline-none sm:text-[36px]"
          aria-label="Document title"
        />
      </div>

      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
        role="toolbar"
        aria-label="Formatting"
      >
        {[
          { label: "Bold", cmd: "bold", icon: <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" /> },
          { label: "Italic", cmd: "italic", icon: <path d="M19 4h-9M14 20H5M15 4L9 20" /> },
          { label: "Underline", cmd: "underline", icon: <path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16" /> },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(b.cmd)}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 transition hover:bg-hover hover:text-ink active:scale-95"
            aria-label={b.label}
            title={b.label}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {b.icon}
            </svg>
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
        {[
          { label: "Heading", cmd: "formatBlock", val: "h2" },
          { label: "Quote", cmd: "formatBlock", val: "blockquote" },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(b.cmd, b.val)}
            className="grid h-10 shrink-0 place-items-center rounded-xl px-3 text-[13.5px] font-semibold text-ink-2 transition hover:bg-hover hover:text-ink active:scale-95"
            aria-label={b.label}
            title={b.label}
          >
            {b.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
        {[
          { label: "Bullet list", cmd: "insertUnorderedList", icon: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" /></> },
          { label: "Numbered list", cmd: "insertOrderedList", icon: <path d="M9 6h12M9 12h12M9 18h12M4 5.5v.01M4 11.5v.01M4 17.5v.01" /> },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(b.cmd)}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 transition hover:bg-hover hover:text-ink active:scale-95"
            aria-label={b.label}
            title={b.label}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {b.icon}
            </svg>
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format("removeFormat")}
          className="grid h-10 shrink-0 place-items-center rounded-xl px-3 text-[13.5px] font-medium text-ink-4 transition hover:bg-hover hover:text-ink active:scale-95"
          aria-label="Clear formatting"
          title="Clear formatting"
        >
          Clear
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-16 sm:px-6">
        <div
          ref={bodyRef}
          contentEditable
          onInput={onInput}
          data-placeholder="Start writing…"
          className="min-h-[50vh] w-full text-[16.5px] leading-[1.75] text-ink focus:outline-none empty:before:pointer-events-none empty:before:text-ink-4/60 empty:before:content-[attr(data-placeholder)] [&_blockquote]:border-l-2 [&_blockquote]:border-accent/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-2 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[22px] [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-3 [&_ul]:mb-3"
          role="textbox"
          aria-multiline="true"
          aria-label="Document content"
          spellCheck
        />
        {/* Mobile word count */}
        <p className="mt-4 text-[12.5px] tabular-nums text-ink-4 sm:hidden">
          {words} word{words === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
