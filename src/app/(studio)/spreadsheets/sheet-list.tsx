"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiSearch } from "@/components/ui/icons";
import { timeAgo } from "@/lib/sheet-format";
import type { SheetCard } from "./page";

const STARTER_IDEAS = [
  "A 12-month SaaS revenue forecast",
  "A monthly budget tracker with categories",
  "A sprint capacity planner for six engineers",
  "An inventory list with stock levels",
];

/** Searchable card grid for the spreadsheets home. Mobile-first. */
export function SheetList({ cards }: { cards: SheetCard[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((c) => c.title.toLowerCase().includes(needle));
  }, [cards, q]);

  return (
    <div>
      <div className="relative mb-5">
        <FiSearch
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search spreadsheets…"
          aria-label="Search spreadsheets"
          className="w-full rounded-full border border-line bg-raised py-3 pl-11 pr-4 text-[14.5px] text-ink placeholder:text-ink-4 focus:border-accent/50 focus:outline-none"
        />
      </div>

      {filtered.length === 0 && q ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">No matches for “{q}”</p>
          <p className="mt-1 text-[13px] text-ink-3">Try a different search, or start a new sheet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-12 text-center sm:py-16">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-positive/15 text-positive">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </span>
          <h2 className="text-[18px] font-semibold text-ink">No spreadsheets yet</h2>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] text-ink-3">
            Create a blank grid or let AI build one from a prompt — with live
            formulas, export to Excel, and autosave.
          </p>
          <Link
            href="/spreadsheets/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110 active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New spreadsheet
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {STARTER_IDEAS.map((idea) => (
              <Link
                key={idea}
                href={`/spreadsheets/new?q=${encodeURIComponent(idea)}`}
                className="rounded-full border border-line bg-raised px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
              >
                {idea}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="group overflow-hidden rounded-3xl border border-line bg-raised transition hover:border-accent/30 hover:shadow-lg active:scale-[0.99]"
            >
              {/* Mini preview */}
              <div className="border-b border-line bg-canvas p-3">
                {c.preview.length ? (
                  <div className="overflow-hidden rounded-xl border border-line/60">
                    <table className="w-full border-collapse text-[10.5px]">
                      <tbody>
                        {c.preview.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`max-w-[90px] truncate border-b border-r border-line/40 px-2 py-1.5 last:border-r-0 ${
                                  ri === 0
                                    ? "bg-sunk font-semibold text-ink-2"
                                    : "text-ink-3"
                                }`}
                              >
                                {cell || " "}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid h-[74px] place-items-center rounded-xl border border-dashed border-line/70 text-[11px] text-ink-4">
                    Empty sheet
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink group-hover:text-accent">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-4">
                    {c.rows > 0 ? `${c.rows}×${c.cols} · ` : ""}
                    {timeAgo(c.updatedAt)}
                  </p>
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunk text-ink-3 transition group-hover:bg-accent/15 group-hover:text-accent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
