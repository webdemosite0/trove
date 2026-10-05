"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  columnLabel,
  cellRefLabel,
  computeGrid,
} from "@/lib/sheet-format";

export interface CellPos {
  r: number;
  c: number;
}

/**
 * A real working spreadsheet grid — Google Sheets / Airtable inspired.
 * Click to select, click again (or Enter / double-click) to edit.
 * Formulas start with "=" and evaluate live. Mobile-first: the grid
 * scrolls horizontally, headers stick, cells are tappable.
 */
export function SheetGrid({
  grid,
  onChange,
  className,
}: {
  grid: string[][];
  onChange: (next: string[][]) => void;
  className?: string;
}) {
  const rows = grid.length;
  const cols = useMemo(
    () => grid.reduce((m, r) => Math.max(m, r.length), 0),
    [grid],
  );
  const display = useMemo(() => computeGrid(grid), [grid]);

  const [sel, setSel] = useState<CellPos | null>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [barDraft, setBarDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rawAt = useCallback(
    (r: number, c: number) => grid[r]?.[c] ?? "",
    [grid],
  );

  const setCell = useCallback(
    (r: number, c: number, value: string) => {
      onChange(
        grid.map((row, ri) => {
          if (ri !== r) return row;
          const next = [...row];
          while (next.length <= c) next.push("");
          next[c] = value;
          return next;
        }),
      );
    },
    [grid, onChange],
  );

  const clampSel = useCallback(
    (p: CellPos): CellPos => ({
      r: Math.max(0, Math.min(rows - 1, p.r)),
      c: Math.max(0, Math.min(cols - 1, p.c)),
    }),
    [rows, cols],
  );

  function startEdit(initial?: string) {
    if (!sel) return;
    setDraft(initial ?? rawAt(sel.r, sel.c));
    setEditing(true);
  }

  function commitEdit() {
    if (!sel) return;
    setCell(sel.r, sel.c, draft);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  // Autofocus + select-all when edit mode begins
  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing, sel]);

  function move(dr: number, dc: number) {
    if (!sel) return;
    setEditing(false);
    setSel(clampSel({ r: sel.r + dr, c: sel.c + dc }));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (editing) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
        if (sel) setSel(clampSel({ r: sel.r + (e.shiftKey ? -1 : 1), c: sel.c }));
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit();
        if (sel) setSel(clampSel({ r: sel.r, c: sel.c + (e.shiftKey ? -1 : 1) }));
      }
      e.stopPropagation();
      return;
    }
    if (!sel) return;
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        startEdit();
        break;
      case "Tab":
        e.preventDefault();
        setSel(clampSel({ r: sel.r, c: sel.c + (e.shiftKey ? -1 : 1) }));
        break;
      case "Escape":
        setSel(null);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1, 0);
        break;
      case "ArrowLeft":
        e.preventDefault();
        move(0, -1);
        break;
      case "ArrowRight":
        e.preventDefault();
        move(0, 1);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        setCell(sel.r, sel.c, "");
        break;
      default:
        // Typing a printable char starts editing with that char
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          startEdit(e.key);
        }
    }
  }

  function onCellClick(r: number, c: number) {
    if (editing) commitEdit();
    if (sel && sel.r === r && sel.c === c && !editing) {
      // second tap/click on the selected cell -> edit
      startEdit();
    } else {
      setSel({ r, c });
    }
  }

  function addRow() {
    onChange([...grid, Array.from({ length: Math.max(cols, 1) }, () => "")]);
  }
  function addCol() {
    onChange(grid.map((row) => [...row, ""]));
  }
  function delRow() {
    if (!sel || rows <= 1) return;
    const next = grid.filter((_, i) => i !== sel.r);
    onChange(next.length ? next : [Array.from({ length: Math.max(cols, 1) }, () => "")]);
    setSel(clampSel({ r: sel.r, c: sel.c }));
    setEditing(false);
  }
  function delCol() {
    if (!sel || cols <= 1) return;
    onChange(grid.map((row) => row.filter((_, i) => i !== sel.c)));
    setSel(clampSel({ r: sel.r, c: sel.c }));
    setEditing(false);
  }

  const selRaw = sel ? rawAt(sel.r, sel.c) : "";
  const barValue = barDraft ?? selRaw;

  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      onKeyDown={onKeyDown}
    >
      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-3 py-2">
        <span className="grid min-w-[52px] place-items-center rounded-md bg-sunk px-2 py-1 font-mono text-[12px] font-semibold text-ink-2">
          {sel ? cellRefLabel(sel.c, sel.r) : "—"}
        </span>
        <span className="font-mono text-[13px] italic text-ink-4">fx</span>
        <input
          ref={barRef}
          value={barValue}
          onChange={(e) => setBarDraft(e.target.value)}
          onFocus={() => setBarDraft(selRaw)}
          onBlur={() => {
            if (sel && barDraft !== null && barDraft !== selRaw) {
              setCell(sel.r, sel.c, barDraft);
            }
            setBarDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            e.stopPropagation();
          }}
          placeholder="Value or formula (=A1+B1)"
          aria-label="Formula bar"
          className="min-w-0 flex-1 rounded-lg bg-canvas px-3 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Row/col toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line bg-canvas px-3 py-1.5">
        <ToolBtn onClick={addRow} label="Add row">+ Row</ToolBtn>
        <ToolBtn onClick={addCol} label="Add column">+ Col</ToolBtn>
        <span className="mx-1 h-4 w-px shrink-0 bg-line" />
        <ToolBtn onClick={delRow} label="Delete selected row" danger disabled={rows <= 1}>− Row</ToolBtn>
        <ToolBtn onClick={delCol} label="Delete selected column" danger disabled={cols <= 1}>− Col</ToolBtn>
        <span className="ml-auto shrink-0 text-[11px] text-ink-4">
          {rows}×{cols}
        </span>
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-canvas">
        <table className="border-collapse" style={{ minWidth: "100%" }}>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-11 min-w-[44px] border-b border-r border-line bg-sunk" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  onClick={() => setSel((s) => (s ? { r: s.r, c } : { r: 0, c }))}
                  className={cn(
                    "sticky top-0 z-10 h-11 min-w-[96px] cursor-pointer border-b border-r border-line bg-sunk px-2 text-center text-[11.5px] font-semibold uppercase tracking-wide text-ink-3 sm:min-w-[128px]",
                    sel?.c === c && "bg-accent/10 text-accent",
                  )}
                >
                  {columnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td
                  onClick={() => setSel((s) => (s ? { r, c: s.c } : { r, c: 0 }))}
                  className={cn(
                    "sticky left-0 z-10 h-11 cursor-pointer border-b border-r border-line bg-sunk px-2 text-center text-[11.5px] font-medium tabular-nums text-ink-3",
                    sel?.r === r && "bg-accent/10 text-accent",
                  )}
                >
                  {r + 1}
                </td>
                {Array.from({ length: cols }, (_, c) => {
                  const isSel = sel?.r === r && sel?.c === c;
                  const isEditing = isSel && editing;
                  const val = display[r]?.[c] ?? "";
                  const isErr = val === "#ERR";
                  return (
                    <td
                      key={c}
                      onClick={() => onCellClick(r, c)}
                      onDoubleClick={() => {
                        setSel({ r, c });
                        startEdit();
                      }}
                      className={cn(
                        "relative h-9 cursor-cell border-b border-r border-line/70 px-2 text-[13px]",
                        isSel
                          ? "z-[5] outline outline-2 outline-accent"
                          : "hover:bg-hover/50",
                        isErr && "text-critical",
                      )}
                      aria-label={`${cellRefLabel(c, r)}${rawAt(r, c).startsWith("=") ? `, formula ${rawAt(r, c)}, value ${val}` : `, ${val}`}`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-0 z-10 h-full w-full bg-canvas px-2 font-mono text-[13px] text-ink focus:outline-none"
                          aria-label={`Edit ${cellRefLabel(c, r)}`}
                        />
                      ) : (
                        <span
                          className={cn(
                            "block max-w-[220px] truncate whitespace-nowrap sm:max-w-[300px]",
                            /^-?[\d,.$\s%]+$/.test(val) && val.trim() !== ""
                              ? "text-right tabular-nums"
                              : "text-left",
                          )}
                        >
                          {val}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  label,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95 disabled:opacity-40",
        danger
          ? "bg-critical/10 text-critical hover:bg-critical/15"
          : "bg-sunk text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
