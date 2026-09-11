"use client";

import { useMemo, useState } from "react";
import {
  FiDownload,
  FiRotateCcw,
} from "@/components/ui/icons";
import {
  downloadCsv,
  downloadXlsx,
  parseMarkdownTable,
  toMarkdownTable,
} from "@/lib/export";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import type { Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useDraft } from "@/lib/use-draft";
import { Cell } from "@/components/sheets/cell";

const EXAMPLES = [
  "A 12-month SaaS revenue forecast",
  "A sprint capacity planner for six engineers",
  "A cloud cost breakdown by service",
  "Make a demo sheet with employees and products",
];

function notesFrom(raw: string) {
  return raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("|"))
    .join("\n")
    .trim();
}

function numberOf(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  const cleaned = s
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[$£€¥₹,\s]/g, "")
    .replace(/%$/, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

function columnLabel(i: number) {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function SpreadsheetView({
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
  const { turns, busy, error, latest, prompt, ask, startOver } = useDraft({
    tool: "sheets",
    restored,
  });

  const [edited, setEdited] = useState<{ from: string; rows: string[][] } | null>(null);
  const rows =
    edited && edited.from === latest ? edited.rows : parseMarkdownTable(latest);
  const notes = notesFrom(latest);

  function setRows(next: string[][] | ((prev: string[][]) => string[][])) {
    const value = typeof next === "function" ? next(rows) : next;
    setEdited({ from: latest, rows: value });
  }

  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const cols = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    [rows],
  );

  const tagCols = useMemo(() => {
    const body = rows.slice(1);
    const out = new Set<number>();
    if (body.length < 3) return out;
    for (let c = 0; c < cols; c++) {
      const vals = body.map((r) => (r[c] ?? "").trim()).filter(Boolean);
      if (vals.length < Math.max(3, body.length * 0.6)) continue;
      if (vals.some((v) => v.length > 24)) continue;
      const numeric = vals.filter((v) => /^[\d$£€,.\-+%\s/]+$/.test(v)).length;
      if (numeric > vals.length * 0.4) continue;
      const unique = new Set(vals.map((v) => v.toLowerCase())).size;
      if (unique <= Math.max(2, Math.ceil(vals.length * 0.6))) out.add(c);
    }
    return out;
  }, [rows, cols]);

  function run(text: string, attachments?: Attachment[]) {
    const current = rows.length
      ? [toMarkdownTable(rows), notes].filter(Boolean).join("\n\n")
      : undefined;
    void ask(text, { attachments, current });
  }

  function edit(r: number, c: number, value: string) {
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      while (next[r].length <= c) next[r].push("");
      next[r][c] = value;
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, Array.from({ length: cols || 1 }, () => "")]);
  }

  function sortBy(c: number) {
    const dir: 1 | -1 = sort?.col === c && sort.dir === 1 ? -1 : 1;
    setSort({ col: c, dir });
    setSelected(null);
    setRows((prev) => {
      if (prev.length < 2) return prev;
      const [header, ...body] = prev;
      const sorted = [...body].sort((a, b) => {
        const av = (a[c] ?? "").trim();
        const bv = (b[c] ?? "").trim();
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        const an = numberOf(av);
        const bn = numberOf(bv);
        if (an !== null && bn !== null) return (an - bn) * dir;
        return av.localeCompare(bv, undefined, { numeric: true }) * dir;
      });
      return [header, ...sorted];
    });
  }

  const totals = useMemo(() => {
    const body = rows.slice(1);
    if (body.length < 2) return [] as (number | null)[];
    const IDENTIFIER =
      /\b(year|yr|id|ids|no|num|number|code|rank|sku|zip|postcode|phone|age|quarter|week|month|day)\b/i;
    return Array.from({ length: cols }, (_, c) => {
      const vals = body.map((r) => (r[c] ?? "").trim()).filter(Boolean);
      if (!vals.length) return null;
      const header = (rows[0]?.[c] ?? "").trim();
      if (IDENTIFIER.test(header)) return null;
      const nums = vals.map(numberOf).filter((n): n is number => n !== null);
      if (nums.length < vals.length * 0.8) return null;
      const yearish = nums.every((n) => Number.isInteger(n) && n >= 1900 && n <= 2100);
      if (yearish) return null;
      return nums.reduce((a, b) => a + b, 0);
    });
  }, [rows, cols]);

  const hasTotals = totals.some((t) => t !== null);
  const fileName =
    (prompt || "sheet")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "sheet";
  const xlsxName = `${fileName}.xlsx`;

  if (turns.length === 0) {
    return (
      <div className="nx-in relative mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-panel)] bg-positive/15 text-positive">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Spreadsheets</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Chat on the left. Live editable grid on the right — export to Excel anytime.
          </p>
        </div>
        <Composer onSend={run} placeholder="Build a spreadsheet for…" autoFocus />
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e, i) => (
            <button
              key={e}
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-line lg:border-b-0 lg:border-r">
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-4">Spreadsheets</p>
            <h1 className="truncate text-[14px] font-semibold text-ink">{prompt || "Sheet"}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setEdited(null);
              startOver();
            }}
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
                {notes && t.text === latest ? (
                  <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
                    {notes.split("\n").slice(0, 10).join("\n")}
                  </div>
                ) : null}
                {rows.length > 0 && t.text === latest ? (
                  <div className="flex items-center gap-3 rounded-[16px] border border-line bg-raised/80 p-3 shadow-sm">
                    <span className="grid size-11 place-items-center rounded-[12px] bg-positive/15 text-positive">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{xlsxName}</p>
                      <p className="text-[12px] text-ink-4">Preview File</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="rounded-full border border-line bg-sunk px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-hover"
                    >
                      Preview
                    </button>
                  </div>
                ) : null}
                {!t.text && busy ? (
                  <p className="text-[13px] text-ink-3">Building the table…</p>
                ) : null}
              </div>
            ),
          )}
          {error ? <FailureNote error={error} onRetry={() => run(prompt)} /> : null}
        </div>

        <div className="shrink-0 border-t border-line bg-canvas/90 p-3 backdrop-blur">
          <Composer onSend={run} disabled={busy} placeholder="Ask anything about this sheet…" />
        </div>
      </div>

      {showPreview ? (
        <div className="flex min-h-[50vh] min-w-0 flex-1 flex-col bg-white text-[#1a1a1a] lg:min-h-0">
          <div className="flex shrink-0 items-center gap-2 border-b border-[#e5e5e5] px-3 py-2.5">
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-[#666] hover:bg-[#f3f3f3] lg:hidden"
              onClick={() => setShowPreview(false)}
              aria-label="Close preview"
            >
              ←
            </button>
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{xlsxName}</p>
            <button
              type="button"
              disabled={!rows.length}
              onClick={() => downloadXlsx(rows, xlsxName)}
              className="grid size-8 place-items-center rounded-full text-[#666] hover:bg-[#f3f3f3] disabled:opacity-40"
              title="Download Excel"
            >
              <FiDownload size={16} />
            </button>
            <button
              type="button"
              disabled={!rows.length}
              onClick={() => downloadCsv(rows, xlsxName.replace(/\.xlsx$/, ".csv"))}
              className="hidden rounded-full px-2.5 py-1 text-[12px] text-[#666] hover:bg-[#f3f3f3] disabled:opacity-40 sm:inline"
            >
              CSV
            </button>
          </div>

          {busy && rows.length === 0 ? (
            <div className="m-auto flex flex-col items-center gap-3 text-[#888]">
              <span className="size-8 animate-spin rounded-full border-2 border-[#ddd] border-t-[#3b82f6]" />
              <p className="text-[13px]">Building preview…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="m-auto text-center text-[13px] text-[#999]">Sheet appears when the table is ready.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-10 border-b border-r border-[#e8e8e8] bg-[#f7f7f8] px-1 py-1.5 text-[11px] font-medium text-[#999]" />
                    {Array.from({ length: cols }, (_, c) => (
                      <th
                        key={c}
                        className="min-w-[120px] border-b border-[#e8e8e8] bg-[#1d4ed8] px-3 py-2 text-left text-[12px] font-semibold text-white"
                      >
                        <button type="button" onClick={() => sortBy(c)} className="flex w-full items-center gap-1">
                          <span className="truncate">{rows[0]?.[c]?.trim() || columnLabel(c)}</span>
                          {sort?.col === c ? <span className="opacity-80">{sort.dir === 1 ? "↑" : "↓"}</span> : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, i) => {
                    const r = i + 1;
                    return (
                      <tr key={r} className="hover:bg-[#f5f8ff]">
                        <td className="sticky left-0 z-10 border-b border-r border-[#eee] bg-[#fafafa] px-1 py-1.5 text-center text-[11px] text-[#aaa]">
                          {r}
                        </td>
                        {Array.from({ length: cols }, (_, c) => (
                          <td key={c} className="border-b border-[#eee] p-0">
                            <Cell
                              value={row[c] ?? ""}
                              header={false}
                              tag={tagCols.has(c)}
                              active={selected?.r === r && selected?.c === c}
                              label={`${rows[0]?.[c] ?? columnLabel(c)}, row ${r}`}
                              onChange={(v) => edit(r, c, v)}
                              onFocus={() => setSelected({ r, c })}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                {hasTotals ? (
                  <tfoot>
                    <tr>
                      <td className="sticky left-0 border-t border-r border-[#e8e8e8] bg-[#f3f4f6] px-1 py-2 text-center text-[10px] text-[#888]">
                        Σ
                      </td>
                      {Array.from({ length: cols }, (_, c) => (
                        <td
                          key={c}
                          className="border-t border-[#e8e8e8] bg-[#f3f4f6] px-3 py-2 text-[12.5px] font-medium tabular-nums text-[#333]"
                        >
                          {totals[c] == null
                            ? ""
                            : totals[c]!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                ) : null}
              </table>
              <div className="flex gap-2 border-t border-[#eee] p-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-full border border-dashed border-[#ccc] px-3 py-1 text-[12px] text-[#666]"
                >
                  + Add row
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
