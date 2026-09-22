"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  TbMessageCircle,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbSearch,
  TbPresentation,
  TbPalette,
  TbUsers,
  TbLayoutDashboard,
  TbBell,
  TbPlugConnected,
  TbCreditCard,
  TbSettings,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconType;
  href: string;
  keys?: string;
}

/** Every destination is a route that exists — nothing here 404s. */
const COMMANDS: Command[] = [
  { id: "new", label: "Chat", hint: "Start something", icon: TbMessageCircle, href: "/chat", keys: "⌘K" },
  { id: "agent", label: "Agents", hint: "A specialist with a brief", icon: TbRobot, href: "/agents", keys: "⌘2" },
  { id: "code", label: "Code", hint: "Complete and runnable", icon: TbCode, href: "/code", keys: "⌘3" },
  { id: "doc", label: "Docs", hint: "Exports to Word", icon: TbFileText, href: "/documents", keys: "⌘4" },
  { id: "sheet", label: "Sheets", hint: "Exports to Excel", icon: TbTable, href: "/spreadsheets", keys: "⌘5" },
  { id: "research", label: "Research", hint: "Findings and open questions", icon: TbSearch, href: "/research", keys: "⌘6" },
  { id: "slides", label: "Decks", hint: "Present, then export", icon: TbPresentation, href: "/slides" },
  { id: "design", label: "Design", hint: "Palette, type, spacing", icon: TbPalette, href: "/design" },
  { id: "team", label: "Team", hint: "Four specialists, one task", icon: TbUsers, href: "/team" },
  { id: "home", label: "Home", hint: "Your workspace", icon: TbLayoutDashboard, href: "/dashboard" },
  { id: "reminders", label: "Alerts", hint: "Notify me later", icon: TbBell, href: "/reminders" },
  { id: "integrations", label: "Apps", hint: "Connect a service", icon: TbPlugConnected, href: "/integrations" },
  { id: "plans", label: "Plan", hint: "Credits and limits", icon: TbCreditCard, href: "/plans" },
  { id: "settings", label: "Settings", hint: "Account and appearance", icon: TbSettings, href: "/settings" },
];

/** Subsequence match, so "bws" finds "Build a website". */
function score(cmd: Command, q: string): number {
  if (!q) return 1;
  const hay = `${cmd.label} ${cmd.hint}`.toLowerCase();
  const needle = q.toLowerCase();
  if (hay.includes(needle)) return 100 - hay.indexOf(needle);

  let i = 0;
  for (const ch of needle) {
    const at = hay.indexOf(ch, i);
    if (at < 0) return 0;
    i = at + 1;
  }
  return 40 - (i - needle.length);
}

export function CommandPalette({ recents = [] }: { recents?: { id: string; title: string; href?: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const ranked = COMMANDS.map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
    return ranked;
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-raised shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const hit = results[active];
                if (hit) go(hit.href);
              }
            }}
            placeholder="Jump to…"
            className="h-12 w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-4"
          />
          <kbd className="rounded border border-line bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-ink-4">No matches</li>
          ) : (
            results.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <li key={cmd.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(cmd.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      i === active ? "bg-hover text-ink" : "text-ink-2",
                    )}
                  >
                    <Icon size={17} className="shrink-0 text-ink-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{cmd.label}</span>
                      <span className="block text-[12px] text-ink-4">{cmd.hint}</span>
                    </span>
                    {cmd.keys ? (
                      <kbd className="rounded border border-line bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4">
                        {cmd.keys}
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
