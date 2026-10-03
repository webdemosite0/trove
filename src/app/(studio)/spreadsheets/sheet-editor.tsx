"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FiArrowLeft, FiDownload, TbSparkles } from "@/components/ui/icons";
import { Thinking } from "@/components/chat/thinking";
import { FailureNote } from "@/components/ui/failure-note";
import { SheetGrid } from "@/components/sheets/sheet-grid";
import {
  blankGrid,
  decodeSheet,
  encodeSheet,
  gridDims,
  normalizeGrid,
  type SheetDoc,
} from "@/lib/sheet-format";
import { parseMarkdownTable } from "@/lib/export";
import { downloadCsv, downloadXlsx } from "@/lib/export";
import { useSaved } from "@/lib/use-saved";
import { localTimeZone } from "@/lib/context";

const AI_EXAMPLES = [
  "A 12-month SaaS revenue forecast",
  "A sprint capacity planner for six engineers",
  "A monthly budget tracker with categories",
  "An inventory list with stock levels",
];

function draftKey(id: string | null) {
  return `trove:sheet-draft:${id ?? "new"}`;
}

/**
 * Full spreadsheet editor: AI generation (Thinking ball while busy),
 * working grid with formulas, save/load, CSV/XLSX export. Mobile-first.
 */
export function SheetEditor({
  sheetId = null,
  initial,
  hideAiBar = false,
}: {
  sheetId?: string | null;
  initial?: { title: string; grid: string[][]; prompt?: string } | null;
  /** Hide the built-in AI prompt bar + header button (split view provides its own chat panel). */
  hideAiBar?: boolean;
}) {
  const router = useRouter();
  const { save } = useSaved("sheets", sheetId);

  const [title, setTitle] = useState(initial?.title ?? "Untitled sheet");
  const [grid, setGrid] = useState<string[][]>(() => {
    if (initial?.grid?.length) return normalizeGrid(initial.grid);
    // restore local draft for brand-new sheets
    try {
      const raw = localStorage.getItem(draftKey(sheetId));
      if (raw) {
        const doc = decodeSheet(raw);
        if (doc?.grid?.length) {
          return doc.grid;
        }
      }
    } catch {
      /* ignore */
    }
    return blankGrid(20, 8);
  });
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [aiOpen, setAiOpen] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dims = useMemo(() => gridDims(grid), [grid]);
  const fileStem = useMemo(
    () =>
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40) || "sheet",
    [title],
  );

  // Local autosave (safety net; server save is explicit + after AI runs)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(sheetId),
          encodeSheet({ title, grid }),
        );
      } catch {
        /* ignore */
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [grid, title, sheetId]);

  const doSave = useCallback(
    async (g: string[][], t: string, userPrompt: string) => {
      const clean = normalizeGrid(g);
      await save(
        [
          { role: "user", text: userPrompt || t },
          { role: "model", text: encodeSheet({ title: t, grid: clean }) },
        ],
        t,
      );
      dirtyRef.current = false;
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      try {
        localStorage.removeItem(draftKey(sheetId));
      } catch {
        /* ignore */
      }
    },
    [save, sheetId],
  );

  const runAi = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setBusy(true);
      setError(null);
      setAiOpen(false);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 90000); // 90s max
        let res: Response;
        try {
          res = await fetch("/api/tool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
              tool: "sheets",
              timeZone: localTimeZone(),
              messages: [{ role: "user", text: q }],
            }),
          });
        } catch (e) {
          clearTimeout(timeout);
          throw new Error(e instanceof Error && e.name === "AbortError" ? "Generation timed out. Try again." : "Network error. Try again.");
        }
        clearTimeout(timeout);
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let out = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          out += decoder.decode(value, { stream: true });
        }
        if (!out.trim()) throw new Error("The model returned nothing. Try again.");
        const table = parseMarkdownTable(out);
        if (!table.length) throw new Error("Couldn't parse a table from the response.");
        const next = normalizeGrid(table);
        setGrid(next);
        const derivedTitle =
          q.length > 48 ? q.slice(0, 48).trimEnd() + "…" : q;
        // Read the current title synchronously via a ref-style snapshot
        setTitle((t) => {
          const finalTitle = t === "Untitled sheet" ? derivedTitle : t;
          void doSave(next, finalTitle, q);
          return finalTitle;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setAiOpen(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, doSave],
  );

  const onGridChange = useCallback((next: string[][]) => {
    setGrid(next);
    dirtyRef.current = true;
  }, []);

  // Auto-generate when arriving with ?q= (starter ideas from the list view)
  const autoRan = useRef(false);
  useEffect(() => {
    if (initial?.prompt && !autoRan.current) {
      autoRan.current = true;
      setAiOpen(false);
      void runAi(initial.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.prompt]);

  // External control: split-view chat panel dispatches these window events.
  const runAiRef = useRef(runAi);
  useEffect(() => {
    runAiRef.current = runAi;
  });
  useEffect(() => {
    function onExternalPrompt(e: Event) {
      const prompt = (e as CustomEvent<string>).detail;
      if (typeof prompt !== "string" || !prompt.trim()) return;
      void runAiRef.current(prompt).finally(() => {
        window.dispatchEvent(new CustomEvent("sheets-ai-done"));
      });
    }
    function onAddRow() {
      setGrid((g) => {
        const cols = Math.max(...g.map((r) => r.length), 1);
        return [...g, Array.from({ length: cols }, () => "")];
      });
      dirtyRef.current = true;
    }
    function onAddCol() {
      setGrid((g) => g.map((row) => [...row, ""]));
      dirtyRef.current = true;
    }
    function onClear() {
      setGrid(blankGrid(20, 8));
      dirtyRef.current = true;
    }
    window.addEventListener("sheets-ai-prompt", onExternalPrompt);
    window.addEventListener("sheets-add-row", onAddRow);
    window.addEventListener("sheets-add-col", onAddCol);
    window.addEventListener("sheets-clear", onClear);
    return () => {
      window.removeEventListener("sheets-ai-prompt", onExternalPrompt);
      window.removeEventListener("sheets-add-row", onAddRow);
      window.removeEventListener("sheets-add-col", onAddCol);
      window.removeEventListener("sheets-clear", onClear);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 py-2 sm:px-4">
        <Link
          href="/spreadsheets"
          aria-label="All spreadsheets"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-hover active:scale-95"
        >
          <FiArrowLeft size={20} />
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Spreadsheet title"
          className="min-w-0 flex-1 truncate bg-transparent text-[16px] font-semibold text-ink focus:outline-none sm:text-[17px]"
        />
        {savedFlash ? (
          <span className="shrink-0 text-[12px] font-medium text-positive">Saved</span>
        ) : null}
        {!hideAiBar ? (
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            aria-expanded={aiOpen}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
              aiOpen ? "bg-accent/15 text-accent" : "bg-sunk text-ink-2 hover:bg-hover",
            )}
          >
            <TbSparkles size={15} />
            <span className="hidden sm:inline">AI</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void doSave(grid, title, prompt || title)}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-95"
        >
          Save
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => downloadXlsx(grid, `${fileStem}.xlsx`)}
            aria-label="Download Excel"
            title="Download Excel (.xlsx)"
            className="grid size-10 place-items-center rounded-full text-ink-3 transition hover:bg-hover active:scale-95"
          >
            <FiDownload size={18} />
          </button>
        </div>
      </header>

      {/* AI prompt bar (hidden in split view — the chat panel is the prompt UI) */}
      {aiOpen && !hideAiBar ? (
        <div className="shrink-0 border-b border-line bg-raised/60 px-3 py-3 sm:px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAi(prompt);
            }}
            className="flex items-center gap-2"
          >
            <TbSparkles size={18} className="shrink-0 text-accent" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the spreadsheet — e.g. “A 12-month SaaS revenue forecast”…"
              aria-label="Describe the spreadsheet to generate"
              className="min-w-0 flex-1 rounded-full bg-canvas px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={busy || !prompt.trim()}
              className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              Build
            </button>
          </form>
          {!busy ? (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
              {AI_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setPrompt(ex);
                    void runAi(ex);
                  }}
                  className="shrink-0 rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
                >
                  {ex}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Busy / error states */}
      {busy ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-raised/60 px-4 py-3">
          <Thinking label="Building your sheet…" size={22} />
        </div>
      ) : null}
      {error ? (
        <div className="shrink-0 px-3 pt-2 sm:px-4">
          <FailureNote error={error} onRetry={() => void runAi(prompt)} />
        </div>
      ) : null}

      {/* Grid */}
      <SheetGrid grid={grid} onChange={onGridChange} className="min-h-0 flex-1" />

      {/* Footer */}
      <footer className="flex shrink-0 items-center gap-3 border-t border-line bg-canvas px-4 py-2">
        <p className="text-[11.5px] text-ink-4">
          {dims.rows} rows · {dims.cols} cols · formulas like <span className="font-mono">=SUM(A1:A10)</span>
        </p>
        <button
          type="button"
          onClick={() => downloadCsv(grid, `${fileStem}.csv`)}
          className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink"
        >
          CSV
        </button>
      </footer>
    </div>
  );
}
