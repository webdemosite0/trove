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
  gridHasFormulas,
  normalizeGrid,
  requestMentionsFormulas,
  type SheetDoc,
} from "@/lib/sheet-format";
import { parseMarkdownTable } from "@/lib/export";
import { downloadCsv, downloadXlsx } from "@/lib/export";
import { useSaved } from "@/lib/use-saved";
import { localTimeZone } from "@/lib/context";
import type { StudioGenResult } from "@/lib/studio-events";
import { deriveRequestedName } from "@/lib/artifact-names";

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
 * Defect 3 (P1) — editor readiness handshake.
 *
 * The split-view chat dispatches `sheets-ai-prompt` as a window event, but on
 * a brand-new sheet the editor only mounts AFTER the first submit (StudioSplit
 * gates the preview on `started`, and the state update that mounts it hasn't
 * flushed when the prompt event is dispatched synchronously in the same
 * submit). A prompt dispatched before the listener below is registered was
 * silently lost: `runAi` never started, no `sheets-ai-done` ever arrived,
 * and the sidebar hung on its backstop timeout with the blank grid still
 * showing. The editor announces readiness after its listeners are
 * registered; the studio waits for it before dispatching.
 */
let sheetsEditorReady = false;

export function isSheetsEditorReady() {
  return sheetsEditorReady;
}

export function whenSheetsEditorReady(timeoutMs: number): Promise<boolean> {
  if (sheetsEditorReady) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("sheets-ai-ready", onReady);
      resolve(v);
    };
    const onReady = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    window.addEventListener("sheets-ai-ready", onReady);
    // Race-free re-check: the editor's mount effect sets the flag and
    // dispatches the event synchronously together, so neither can slip
    // between the first check and listener registration on this thread.
    if (sheetsEditorReady) finish(true);
  });
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
  // QA-05: set when the grid initializer restores a local draft, so the
  // starter-idea auto-run below never regenerates over a user's saved work.
  const restoredDraftRef = useRef(false);
  const [grid, setGrid] = useState<string[][]>(() => {
    if (initial?.grid?.length) return normalizeGrid(initial.grid);
    // restore local draft for brand-new sheets
    try {
      const raw = localStorage.getItem(draftKey(sheetId));
      if (raw) {
        const doc = decodeSheet(raw);
        if (doc?.grid?.length) {
          restoredDraftRef.current = true;
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
  // R2 (P1): explicit-save failures surface here, honestly. The AI error
  // state above is for generation; a failed save must not be retried as a
  // regeneration.
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * QA-05 request ownership: every generation request gets a unique sequence
   * number (genSeqRef) and every manual grid edit bumps editSeqRef. A result
   * is applied only if no newer request was issued and no manual edit
   * happened since it started — otherwise it waits for explicit Apply.
   */
  const genSeqRef = useRef(0);
  const editSeqRef = useRef(0);
  /** A generated grid that arrived stale (user edited meanwhile). */
  const [pendingGen, setPendingGen] = useState<{
    grid: string[][];
    title: string;
    prompt: string;
  } | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

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

  /**
   * R2 (P1): returns true only when the server CONFIRMED persistence.
   * "Saved" flashes and the local draft is dropped only on confirmation —
   * a failed save must never read as saved, and the draft (the user's
   * recovery copy) must survive it.
   */
  const doSave = useCallback(
    async (g: string[][], t: string, userPrompt: string): Promise<boolean> => {
      const clean = normalizeGrid(g);
      const result = await save(
        [
          { role: "user", text: userPrompt || t },
          { role: "model", text: encodeSheet({ title: t, grid: clean }) },
        ],
        t,
      );
      if (!result.ok) return false;
      dirtyRef.current = false;
      setSaveError(null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      try {
        localStorage.removeItem(draftKey(sheetId));
      } catch {
        /* ignore */
      }
      return true;
    },
    [save, sheetId],
  );

  /** Explicit Save button: an honest error on failure, never a false Saved. */
  const handleSaveClick = useCallback(() => {
    setSaveError(null);
    void doSave(grid, title, prompt || title).then((ok) => {
      if (!ok) {
        setSaveError(
          "Couldn't save this spreadsheet. Your work is still here — check your connection and try again.",
        );
      }
    });
  }, [doSave, grid, title, prompt]);

  const runAi = useCallback(
    async (text: string, reqId?: string): Promise<StudioGenResult> => {
      const q = text.trim();
      // Defect 3 (P1): stage breadcrumb — recorded as generation progresses
      // so a timeout/failure can say WHERE it stalled. Surfaced via the
      // `details` field the studio sidebar renders under the error.
      const t0 = Date.now();
      let lastSignal = "start";
      const details = () =>
        `reqId=${reqId ?? "local"} handler=sheets/runAi waited=${Math.round((Date.now() - t0) / 1000)}s lastSignal=${lastSignal}`;
      if (!q || busy) {
        return {
          ok: false,
          error: "Still building the previous request — wait a moment.",
          reqId,
          details: details(),
        };
      }
      // QA-05: tag this request; capture the manual-edit baseline so a late
      // result can't silently clobber newer edits.
      const myGen = ++genSeqRef.current;
      const baselineEdit = editSeqRef.current;
      setBusy(true);
      setError(null);
      setAiOpen(false);
      try {
        const ctrl = new AbortController();
        // Defect 3 (P1): 90s is a TOTAL budget for the AI round-trip, not
        // just time-to-first-byte. The timer used to be cleared when response
        // headers arrived, leaving the body-read loop below unbounded — a
        // stalled upstream stream hung runAi forever, `sheets-ai-done` was
        // never dispatched, and the sidebar could only report its own
        // backstop timeout with no clue where it stalled. Aborting also
        // rejects a pending reader.read(), so the budget covers a stalled
        // stream as well as a slow connect.
        const timeout = setTimeout(() => ctrl.abort(), 90000); // 90s max
        let res: Response;
        try {
          lastSignal = "api-fetch";
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
          lastSignal = "api-headers";
        } catch (e) {
          throw new Error(e instanceof Error && e.name === "AbortError" ? "Generation timed out. Try again." : "Network error. Try again.");
        }
        try {
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
            lastSignal = `streaming:${out.length}b`;
          }
          lastSignal = "stream-done";
          if (!out.trim()) throw new Error("The model returned nothing. Try again.");
          const table = parseMarkdownTable(out);
          if (!table.length) throw new Error("Couldn't parse a table from the response.");
          // R1 (P1): if the request explicitly asked for formulas but the
          // parsed grid holds zero formula cells, the model pre-computed
          // constants instead of preserving formulas — fail honestly (with
          // a retry path via the sidebar) instead of presenting constants
          // as a successful formula sheet.
          if (requestMentionsFormulas(q) && !gridHasFormulas(table)) {
            throw new Error(
              "Your request asked for formulas, but the result came back with none — the values were computed instead of stored as formulas. Try again.",
            );
          }
          lastSignal = `parsed:${table.length}x${table[0]?.length ?? 0}`;
          const next = normalizeGrid(table);
          // R6: an explicit name in the prompt ("named \"Q3 Budget\"") wins
          // over the truncated-prompt fallback. Only applied while the title
          // is still the default — never over a manual title.
          const derivedTitle =
            deriveRequestedName(q) ??
            (q.length > 48 ? q.slice(0, 48).trimEnd() + "…" : q);
          const finalTitle =
            titleRef.current === "Untitled sheet" ? derivedTitle : titleRef.current;
          // QA-05: only apply if this request is still the newest and no manual
          // edit happened while it was in flight. Otherwise hold the result for
          // explicit user Apply — never silently replace their edits.
          if (
            genSeqRef.current !== myGen ||
            editSeqRef.current !== baselineEdit
          ) {
            setPendingGen({ grid: next, title: finalTitle, prompt: q });
            return { ok: true, applied: false, stale: true, reqId };
          }
          setPendingGen(null);
          setGrid(next);
          if (titleRef.current === "Untitled sheet") setTitle(finalTitle);
          lastSignal = "saving";
          // Saving is best-effort bookkeeping: the grid above is already
          // applied and visible, so never let a slow save hold the
          // completion signal hostage — race it and move on. A failed
          // background save stays silent here (no false "Saved": doSave
          // only flashes on confirmation); the explicit Save button owns
          // the honest error path.
          const savedInTime = await Promise.race([
            doSave(next, finalTitle, q).then(
              (ok) => ok,
              () => false,
            ),
            new Promise<boolean>((r) => setTimeout(() => r(false), 15000)),
          ]);
          lastSignal = savedInTime ? "saved" : "save-timed-out";
          return { ok: true, applied: true, reqId };
        } finally {
          clearTimeout(timeout);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
        setAiOpen(true);
        // QA-01: a failed/empty generation must surface as a failure, never
        // as a silent "Done" with a blank grid.
        return { ok: false, error: message, reqId, details: details() };
      } finally {
        setBusy(false);
      }
    },
    [busy, doSave],
  );

  /** Apply a stale generation result the user explicitly accepted (QA-05). */
  const applyPendingGen = useCallback(async () => {
    if (!pendingGen) return;
    const { grid: next, title: t, prompt: p } = pendingGen;
    setPendingGen(null);
    setGrid(next);
    const finalTitle = titleRef.current === "Untitled sheet" ? t : titleRef.current;
    if (titleRef.current === "Untitled sheet") setTitle(t);
    await doSave(next, finalTitle, p);
  }, [pendingGen, doSave]);

  const onGridChange = useCallback((next: string[][]) => {
    setGrid(next);
    dirtyRef.current = true;
    editSeqRef.current += 1; // QA-05: manual edit — supersedes in-flight generations
  }, []);

  // Auto-generate when arriving with ?q= (starter ideas from the list view)
  const autoRan = useRef(false);
  useEffect(() => {
    if (initial?.prompt && !autoRan.current) {
      autoRan.current = true;
      // QA-05: a (re)load must never regenerate over existing content. The
      // starter-idea auto-run is only for brand-new, empty sheets — opening
      // a saved sheet (or restoring a draft with manual edits) must not
      // trigger a generation that would overwrite it on arrival.
      if (restoredDraftRef.current) return;
      if ((initial?.grid?.length ?? 0) > 0) return;
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
      const detail = (
        e as CustomEvent<{ prompt: string; reqId?: string } | string>
      ).detail;
      const prompt = typeof detail === "string" ? detail : detail?.prompt;
      const reqId = typeof detail === "string" ? undefined : detail?.reqId;
      if (typeof prompt !== "string" || !prompt.trim()) return;
      // QA-01: forward the editor's real result (ok/applied/error) so the
      // sidebar never declares success on a failed or empty generation.
      void runAiRef.current(prompt, reqId).then((result) => {
        window.dispatchEvent(
          new CustomEvent<StudioGenResult>("sheets-ai-done", { detail: result }),
        );
      });
    }
    function onAddRow() {
      setGrid((g) => {
        const cols = Math.max(...g.map((r) => r.length), 1);
        return [...g, Array.from({ length: cols }, () => "")];
      });
      dirtyRef.current = true;
      editSeqRef.current += 1; // QA-05: manual edit
    }
    function onAddCol() {
      setGrid((g) => g.map((row) => [...row, ""]));
      dirtyRef.current = true;
      editSeqRef.current += 1; // QA-05: manual edit
    }
    function onClear() {
      setGrid(blankGrid(20, 8));
      dirtyRef.current = true;
      editSeqRef.current += 1; // QA-05: manual edit
    }
    window.addEventListener("sheets-ai-prompt", onExternalPrompt);
    window.addEventListener("sheets-add-row", onAddRow);
    window.addEventListener("sheets-add-col", onAddCol);
    window.addEventListener("sheets-clear", onClear);
    // Defect 3 (P1): announce readiness AFTER the prompt listener above is
    // registered — the studio waits for this before dispatching, so the
    // first prompt on a brand-new sheet (where this editor only mounts as a
    // result of the submit) is never silently lost.
    sheetsEditorReady = true;
    window.dispatchEvent(new CustomEvent("sheets-ai-ready"));
    return () => {
      window.removeEventListener("sheets-ai-prompt", onExternalPrompt);
      window.removeEventListener("sheets-add-row", onAddRow);
      window.removeEventListener("sheets-add-col", onAddCol);
      window.removeEventListener("sheets-clear", onClear);
      sheetsEditorReady = false;
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
          onClick={handleSaveClick}
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
      {/* R2 (P1): an explicit save that the server did not confirm surfaces
          as a failure with a save retry — never as a silent "Saved". */}
      {saveError ? (
        <div className="shrink-0 px-3 pt-2 sm:px-4">
          <FailureNote error={saveError} onRetry={handleSaveClick} />
        </div>
      ) : null}
      {/* QA-05: a generation result that arrived stale (user edited or a newer
          request superseded it) waits for explicit Apply — never silently
          replaces their work. */}
      {pendingGen ? (
        <div className="shrink-0 px-3 pt-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] text-ink-2">
            <span>
              A generated sheet arrived after your edits. Apply it, or keep
              what you have.
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void applyPendingGen()}
                className="rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 active:scale-95"
              >
                Apply generated
              </button>
              <button
                type="button"
                onClick={() => setPendingGen(null)}
                className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[12.5px] font-medium text-ink-3 transition hover:text-ink active:scale-95"
              >
                Discard
              </button>
            </span>
          </div>
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
