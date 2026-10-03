"use client";

import { useCallback } from "react";
import { StudioSplit } from "@/components/studio/studio-split";
import { SheetEditor } from "@/app/(studio)/spreadsheets/sheet-editor";

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
 * Chat prompts are forwarded to the editor via the `sheets-ai-prompt` window event;
 * the editor signals completion with `sheets-ai-done`.
 */
export function SheetsStudio({
  sheetId = null,
  initial,
}: {
  sheetId?: string | null;
  initial?: { title: string; grid: string[][]; prompt?: string } | null;
}) {
  const handlePrompt = useCallback((prompt: string) => {
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("sheets-ai-done", done);
        resolve();
      };
      window.addEventListener("sheets-ai-done", done);
      // Safety net so the chat never hangs if the editor is gone.
      setTimeout(done, 120000);
      window.dispatchEvent(new CustomEvent("sheets-ai-prompt", { detail: prompt }));
    });
  }, []);

  return (
    <StudioSplit
      title="Spreadsheet"
      preview={<SheetEditor sheetId={sheetId} initial={initial} hideAiBar />}
      onPrompt={handlePrompt}
      suggestions={SUGGESTIONS}
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
