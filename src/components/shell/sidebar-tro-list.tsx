"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "@/components/agents/bot";
import { listAgents, type AgentRow } from "@/app/actions/agents";
import { cn } from "@/lib/utils";

/**
 * The Tro list, living inside the main app sidebar.
 * This is the single sidebar — the old standalone TroListPanel
 * in the Tro chat view was removed.
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
      <div className="space-y-1 px-1">
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`/tros/${a.id}`}
            title={a.name}
            aria-current={a.id === activeId ? "page" : undefined}
            className={cn(
              "grid size-11 place-items-center rounded-2xl transition",
              a.id === activeId
                ? "bg-hover ring-1 ring-line-strong"
                : "hover:bg-hover",
            )}
          >
            <Bot size={30} seed={a.id} accent={a.accent} state="idle" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">
        Tros
      </p>
      {agents.map((a) => {
        const active = a.id === activeId;
        return (
          <Link
            key={a.id}
            href={`/tros/${a.id}`}
            aria-current={active ? "page" : undefined}
            title={a.name}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition",
              active ? "bg-hover font-medium text-ink" : "hover:bg-hover/60 text-ink-2",
            )}
          >
            <span className="shrink-0">
              <Bot size={28} seed={a.id} accent={a.accent} state="idle" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{a.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
