"use client";

import Link from "next/link";
import { Bot } from "@/components/agents/bot";
import type { AgentRow } from "@/app/actions/agents";
import { cn } from "@/lib/utils";
import { FiPlus, FiSearch } from "@/components/ui/icons";
import { useState } from "react";

/**
 * Mobile Tros home — premium card list, thumb-friendly.
 * Separate UI from desktop: large touch targets, bottom-sheet feel.
 */
export function MobileTrosHome({ agents }: { agents: AgentRow[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? agents.filter((a) =>
        `${a.name} ${a.role ?? ""}`.toLowerCase().includes(q),
      )
    : agents;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Header */}
      <div className="shrink-0 px-5 pb-3 pt-6">
        <h1 className="text-[28px] font-bold tracking-tight text-ink">Tros</h1>
        <p className="mt-1 text-[14px] text-ink-3">
          Your AI specialists
        </p>
      </div>

      {/* Search */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex items-center gap-2.5 rounded-2xl bg-sunk px-4 py-3">
          <FiSearch size={18} className="shrink-0 text-ink-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tros"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-32">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-[15px] text-ink-3">
              {agents.length ? "No Tros match." : "No Tros yet."}
            </p>
            <Link
              href="/tros?new=1"
              className="mt-4 rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white"
            >
              Create your first Tro
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <Link
                key={a.id}
                href={`/tros/${a.id}`}
                className="flex items-center gap-4 rounded-3xl border border-line/60 bg-raised p-4 shadow-sm transition active:scale-[0.98]"
              >
                <Bot size={56} seed={a.id} accent={a.accent} state="idle" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-ink">
                    {a.name}
                  </p>
                  {a.role ? (
                    <p className="mt-0.5 truncate text-[13.5px] text-ink-3">
                      {a.role}
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    "bg-accent/10 text-accent",
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/tros?new=1"
        aria-label="New Tro"
        className="fixed bottom-24 right-5 grid size-14 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition active:scale-95"
      >
        <FiPlus size={24} />
      </Link>
    </div>
  );
}
