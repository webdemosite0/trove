"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNav } from "@/components/shell/nav-state";
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
  TbFolder,
  FiClock,
  FiPlus,
} from "@/components/ui/icons";
import { SearchIcon } from "@/components/animate-ui/icons";
import { cn } from "@/lib/utils";
import { useIsWindows } from "@/lib/use-is-windows";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconType;
  tone: string;
  href: string;
  /** Opens the settings overlay at this section instead of navigating. */
  overlay?: string;
  keys?: string;
  group: "Create" | "Navigate";
}

const COMMANDS: Command[] = [
  { id: "new-chat", label: "New chat", hint: "Start a conversation", icon: FiPlus, tone: "#7c6fff", href: "/chat", group: "Create" },
  { id: "new-tro", label: "New Tro", hint: "Hire a specialist", icon: TbRobot, tone: "#a78bfa", href: "/tros?new=1", group: "Create" },
  { id: "new-project", label: "New project", hint: "Name it and brief it", icon: TbFolder, tone: "#f59e0b", href: "/projects", group: "Create" },
  { id: "new-doc", label: "New document", hint: "Draft in chat", icon: TbFileText, tone: "#8b5cf6", href: "/documents", group: "Create" },
  { id: "new-sheet", label: "New spreadsheet", hint: "Model in chat", icon: TbTable, tone: "#d97706", href: "/spreadsheets", group: "Create" },
  { id: "nav-chat", label: "Chat", hint: "Your conversations", icon: TbMessageCircle, tone: "#7c6fff", href: "/chat", keys: "⌘K", group: "Navigate" },
  { id: "nav-agents", label: "Agents", hint: "A specialist with a brief", icon: TbRobot, tone: "#a78bfa", href: "/agents", keys: "⌘2", group: "Navigate" },
  { id: "nav-code", label: "Code", hint: "Complete and runnable", icon: TbCode, tone: "#22c55e", href: "/code", keys: "⌘3", group: "Navigate" },
  { id: "nav-doc", label: "Docs", hint: "Exports to Word", icon: TbFileText, tone: "#8b5cf6", href: "/documents", keys: "⌘4", group: "Navigate" },
  { id: "nav-sheet", label: "Sheets", hint: "Exports to Excel", icon: TbTable, tone: "#d97706", href: "/spreadsheets", keys: "⌘5", group: "Navigate" },
  { id: "nav-research", label: "Research", hint: "Findings and open questions", icon: TbSearch, tone: "#0d9488", href: "/research", keys: "⌘6", group: "Navigate" },
  { id: "nav-slides", label: "Decks", hint: "Present, then export", icon: TbPresentation, tone: "#e11d48", href: "/slides", group: "Navigate" },
  { id: "nav-design", label: "Design", hint: "Palette, type, spacing", icon: TbPalette, tone: "#ec4899", href: "/design", group: "Navigate" },
  { id: "nav-team", label: "Team", hint: "Four specialists, one task", icon: TbUsers, tone: "#f59e0b", href: "/team", group: "Navigate" },
  { id: "nav-home", label: "Home", hint: "Your workspace", icon: TbLayoutDashboard, tone: "#64748b", href: "/dashboard", group: "Navigate" },
  { id: "nav-reminders", label: "Alerts", hint: "Notify me later", icon: TbBell, tone: "#f43f5e", href: "/reminders", group: "Navigate" },
  { id: "nav-integrations", label: "Apps", hint: "Connect a service", icon: TbPlugConnected, tone: "#0284c7", href: "/settings", group: "Navigate", overlay: "integrations" },
  { id: "nav-plans", label: "Plan", hint: "Credits and limits", icon: TbCreditCard, tone: "#8b5cf6", href: "/plans", group: "Navigate" },
  { id: "nav-settings", label: "Settings", hint: "Account and appearance", icon: TbSettings, tone: "#64748b", href: "/settings", group: "Navigate", overlay: "general" },
];

interface Recent {
  id: string;
  title: string;
  href?: string;
}

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

function Row({
  active,
  icon,
  tone,
  label,
  hint,
  keys,
  onGo,
  onHover,
}: {
  active: boolean;
  icon: IconType;
  tone: string;
  label: string;
  hint: string;
  keys?: string;
  onGo: () => void;
  onHover: () => void;
}) {
  const Icon = icon;
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={onGo}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
          active ? "bg-hover text-ink" : "text-ink-2",
        )}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{ background: `${tone}1a`, color: tone }}
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{label}</span>
          <span className="block truncate text-[12px] text-ink-4">{hint}</span>
        </span>
        {keys ? (
          <kbd className="rounded border border-line bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4">
            {keys}
          </kbd>
        ) : null}
      </button>
    </li>
  );
}

export function CommandPalette({ recents = [] }: { recents?: Recent[] }) {
  const router = useRouter();
  const isWindows = useIsWindows();
  const { openSettings } = useNav();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flat: Command[] = useMemo(() => {
    const ranked = COMMANDS.map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
    // Keep group order stable: Create first, then Navigate.
    return [
      ...ranked.filter((c) => c.group === "Create"),
      ...ranked.filter((c) => c.group === "Navigate"),
    ];
  }, [q]);

  const recentItems = useMemo(
    () => (!q ? recents.filter((r) => r.href).slice(0, 4) : []),
    [q, recents],
  );

  const total = recentItems.length + flat.length;

  function go(href: string, overlay?: string) {
    setOpen(false);
    if (overlay) {
      openSettings(overlay);
      return;
    }
    router.push(href);
  }

  function goIndex(i: number) {
    if (i < recentItems.length) {
      const r = recentItems[i];
      if (r?.href) go(r.href);
      return;
    }
    const hit = flat[i - recentItems.length];
    if (hit) go(hit.href, hit.overlay);
  }

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

  if (!open) return null;

  let cursor = -1;
  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-[580px] overflow-hidden rounded-2xl border border-line bg-raised shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <SearchIcon size={16} className="shrink-0 text-ink-4" aria-hidden />
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
                setActive((i) => Math.min(i + 1, Math.max(0, total - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                goIndex(active);
              }
            }}
            placeholder="Create, jump to, or reopen…"
            className="h-12 w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-4"
          />
          <kbd className="rounded border border-line bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4">esc</kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {total === 0 ? (
            <li className="px-3 py-8 text-center">
              <p className="text-[13.5px] font-medium text-ink-2">No matches for “{q}”</p>
              <p className="mt-1 text-[12.5px] text-ink-4">Try “doc”, “tro”, or “billing”.</p>
            </li>
          ) : (
            <>
              {recentItems.length > 0 && (
                <li className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">
                  Recent
                </li>
              )}
              {recentItems.map((r) => {
                cursor += 1;
                const i = cursor;
                return (
                  <Row
                    key={r.id}
                    active={i === active}
                    icon={FiClock}
                    tone="#64748b"
                    label={r.title}
                    hint="Reopen"
                    onGo={() => r.href && go(r.href)}
                    onHover={() => setActive(i)}
                  />
                );
              })}
              {flat.map((cmd) => {
                cursor += 1;
                const i = cursor;
                const showHeader = cmd.group !== lastGroup;
                lastGroup = cmd.group;
                return (
                  <Fragment key={cmd.id}>
                    {showHeader ? (
                      <li className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">
                        {cmd.group}
                      </li>
                    ) : null}
                    <Row
                      active={i === active}
                      icon={cmd.icon}
                      tone={cmd.tone}
                      label={cmd.label}
                      hint={cmd.hint}
                      keys={cmd.keys === "⌘K" && isWindows ? "Ctrl+K" : cmd.keys}
                      onGo={() => go(cmd.href)}
                      onHover={() => setActive(i)}
                    />
                  </Fragment>
                );
              })}
            </>
          )}
        </ul>

        <div className="flex items-center gap-4 border-t border-line bg-sunk/50 px-4 py-2 text-[11px] text-ink-4">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-raised px-1 py-0.5">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-raised px-1 py-0.5">↵</kbd> open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-raised px-1 py-0.5">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
