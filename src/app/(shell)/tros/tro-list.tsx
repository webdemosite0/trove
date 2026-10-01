"use client";

import { useState } from "react";
import Link from "next/link";
import { FiPlus, FiSearch, FiTrash2, FiX } from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { AgentRow } from "@/app/actions/agents";

export function timeAgo(ts: number): string {
  const t = ts > 1e12 ? Math.floor(ts / 1000) : ts;
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Muse-style conversation list, but for Tros: mascot avatar, name,
 * role snippet, recency, hover delete. Shared by the Tros home and
 * the Tro workspace so the list persists like a chat sidebar.
 */
export function TroListPanel({
  agents,
  activeId,
  onNew,
  onDelete,
  className,
}: {
  agents: AgentRow[];
  activeId?: string;
  onNew: () => void;
  onDelete: (id: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? agents.filter((a) => `${a.name} ${a.role} ${a.instructions}`.toLowerCase().includes(q))
    : agents;

  return (
    <div className={cn("flex min-h-0 flex-col bg-canvas", className)}>
      <div className="shrink-0 px-3 pt-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-raised px-3 py-2.5 text-[13.5px] font-semibold text-ink shadow-sm transition duration-200 hover:-translate-y-px hover:border-violet-500/40 hover:bg-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          <Ico icon={FiPlus} motion="open" size={15} /> New Tro
        </button>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">
            <Ico icon={FiSearch} size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tros"
            aria-label="Search Tros"
            className="w-full rounded-xl border border-transparent bg-sunk/70 py-2 pl-9 pr-8 text-[13px] text-ink outline-none transition placeholder:text-ink-4 focus:border-line-strong focus:bg-sunk"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-4 transition hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiX} size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="app-stagger mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] leading-relaxed text-ink-4">
            {q ? (
              <>No Tros match “{query.trim()}”.</>
            ) : (
              <>No Tros yet. Create one to start building your team.</>
            )}
          </p>
        ) : (
          filtered.map((a) => {
            const active = a.id === activeId;
            return (
              <div key={a.id} className="group relative">
                <Link
                  href={`/tros/${a.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
                    active
                      ? "bg-hover shadow-[inset_2px_0_0_0_#8b5cf6]"
                      : "hover:bg-hover/60 hover:translate-x-px",
                  )}
                >
                  <Bot size={38} seed={a.id} accent={a.accent} state="idle" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-ink">{a.name}</span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-ink-4">{timeAgo(a.created_at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                      {a.role || a.instructions || "Specialist"}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  aria-label={`Delete ${a.name}`}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-4 opacity-0 transition hover:bg-critical/10 hover:text-critical focus:opacity-100 group-hover:opacity-100"
                >
                  <Ico icon={FiTrash2} size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
