"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "@/components/agents/bot";
import { listAgents, type AgentRow } from "@/app/actions/agents";
import { cn } from "@/lib/utils";

/**
 * The Tros sidebar list — deliberately distinct from the Trove sidebar.
 * Tro-first: your Tros are the hero here, as cards with mascots,
 * roles, and live working dots. Not a nav list.
 */
export function SidebarTroList({ rail }: { rail: boolean }) {
  const pathname = usePathname() || "";
  const [agents, setAgents] = useState<AgentRow[]>([]);

  useEffect(() => {
    let alive = true;
    listAgents()
      .then((rows) => {
        if (alive) setAgents(rows ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!agents.length) return null;

  const activeId = pathname.startsWith("/tros/")
    ? pathname.split("/")[2]?.split("?")[0]
    : null;

  if (rail) {
    return (
      <div className="space-y-1.5 px-1">
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`/tros/${a.id}`}
            title={a.name}
            aria-current={a.id === activeId ? "page" : undefined}
            className={cn(
              "relative grid size-11 place-items-center rounded-2xl transition",
              a.id === activeId
                ? "bg-violet-500/15 ring-1 ring-violet-500/40"
                : "hover:bg-violet-500/10",
            )}
          >
            <Bot size={30} seed={a.id} accent={a.accent} state="idle" />
            {a.id === activeId ? (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-violet-500 ring-2 ring-rail" />
            ) : null}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {agents.map((a) => {
        const active = a.id === activeId;
        return (
          <Link
            key={a.id}
            href={`/tros/${a.id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border p-2 pr-3 transition-all duration-200",
              active
                ? "border-violet-500/40 bg-violet-500/[0.08] shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
                : "border-transparent hover:border-line hover:bg-hover/70",
            )}
          >
            <span className="relative shrink-0">
              <Bot size={36} seed={a.id} accent={a.accent} state="idle" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[13.5px] leading-tight",
                  active ? "font-semibold text-ink" : "font-medium text-ink-2",
                )}
              >
                {a.name}
              </span>
              {a.role ? (
                <span className="block truncate text-[11px] leading-tight text-ink-4">
                  {a.role}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
