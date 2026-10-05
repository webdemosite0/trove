"use client";

import { useCallback } from "react";
import { StudioSplit } from "@/components/studio/studio-split";
import {
  SheetEditor,
  whenSheetsEditorReady,
} from "@/app/(studio)/spreadsheets/sheet-editor";
import {
  studioResultOf,
  type StudioGenResult,
} from "@/lib/studio-events";

const SUGGESTIONS = [
  "A 12-month SaaS revenue forecast",
  "A monthly budget tracker with categories",
  "A sprint capacity planner for six engineers",
  "An inventory list with stock levels",
];

function dispatch(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

/**
 * Spreadsheets studio: sheet editor on the left, chat + quick actions on the right.
 * Chat prompts are forwarded to the editor via the `sheets-ai-prompt` window event
 * (carrying { prompt, reqId }); the editor signals completion with
 * `sheets-ai-done` echoing the reqId. The editor announces `sheets-ai-ready`
 * once its prompt listener is registered — the chat waits for it before
 * dispatching, so the first prompt on a brand-new sheet (where the editor
 * only mounts as a result of the submit) is never silently lost (defect 3).
 */
export function SheetsStudio({
  sheetId = null,
  initial,
}: {
  sheetId?: string | null;
  initial?: { title: string; grid: string[][]; prompt?: string } | null;
}) {
  // QA-01: wait for the editor's real completion event (with its
  // ok/applied/error payload). A timeout is a failure, never a silent "Done".
  const handlePrompt = useCallback((prompt: string): Promise<StudioGenResult> => {
    // QA-05: tag this request so a late/stale editor event from an
    // overlapping generation can't resolve the wrong prompt.
    const reqId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<StudioGenResult>((resolve) => {
      let settled = false;
      const startedAt = Date.now();
      // Defect 3 (P1): the editor self-aborts a hung generation at 90s, so
      // this backstop only fires when the editor never answered at all —
      // keep it just past 90s so a silent editor fails fast instead of
      // hanging "Creating…" for 3 minutes.
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener("sheets-ai-done", onDone);
        const waitedMs = Date.now() - startedAt;
        // Defect 3: diagnostic breadcrumb linking the chat command to the
        // editor execution (request id, handler, elapsed, last progress).
        console.error("[sheets-studio/handlePrompt] generation timed out", {
          reqId,
          handler: "sheets/runAi",
          waitedMs,
          lastSignal: "sheets-ai-done never arrived",
        });
        resolve({
          ok: false,
          error: "The spreadsheet editor didn't respond in time.",
          reqId,
          details: `reqId=${reqId} handler=sheets/runAi waited=${Math.round(waitedMs / 1000)}s lastSignal=sheets-ai-done-never-arrived`,
        });
      }, 100_000);
      function onDone(e: Event) {
        if (settled) return;
        const result = studioResultOf(e);
        // Ignore events for other requests.
        if (!result || result.reqId !== reqId) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener("sheets-ai-done", onDone);
        resolve(result);
      }
      // QA-01: register the completion listener BEFORE the prompt is
      // dispatched so it can't be missed.
      window.addEventListener("sheets-ai-done", onDone);
      // Defect 3 (P1): on a brand-new sheet the editor only mounts as a
      // result of this submit (StudioSplit gates the preview on `started`),
      // so dispatching the prompt event immediately would fire before its
      // listener exists and the request would be silently lost. Wait for the
      // editor's ready signal first; if it never comes, dispatch anyway and
      // let the backstop above report it with diagnostics.
      void whenSheetsEditorReady(8000).then(() => {
        if (settled) return;
        window.dispatchEvent(
          new CustomEvent("sheets-ai-prompt", { detail: { prompt, reqId } }),
        );
      });
    });
  }, []);

  return (
    <StudioSplit
      title="Spreadsheet"
      placeholder="Describe the spreadsheet you need…"
      // A deep-linked starter idea (?q=) carries a prompt but no grid yet —
      // count it as content so the editor mounts immediately and its
      // auto-run fires instead of showing the empty state forever.
      hasContent={!!initial?.grid?.length || !!initial?.prompt}
      preview={<SheetEditor sheetId={sheetId} initial={initial} hideAiBar />}
      onPrompt={handlePrompt}
      suggestions={SUGGESTIONS}
      enableRetry
      customize={
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch("sheets-add-row")}
              className="rounded-full border border-line bg-sunk px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
            >
              + Row
            </button>
            <button
              type="button"
              onClick={() => dispatch("sheets-add-col")}
              className="rounded-full border border-line bg-sunk px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
            >
              + Column
            </button>
            <button
              type="button"
              onClick={() => dispatch("sheets-clear")}
              className="rounded-full border border-line bg-sunk px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-critical/40 hover:text-critical active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      }
    />
  );
}
