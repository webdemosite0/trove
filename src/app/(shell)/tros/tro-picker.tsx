"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { AgentRow } from "@/app/actions/agents";

/**
 * "Agent" dropdown for the Tros home hero composer: pick which Tro receives
 * the message. Mascot avatar + live presence dot per Tro, dark-styled for the
 * near-black Tros home.
 */
export function TroPicker({
  agents,
  value,
  onChange,
  workingIds,
  disabled,
}: {
  agents: AgentRow[];
  value: string | null;
  onChange: (id: string) => void;
  workingIds: Set<string>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const selected = agents.find((a) => a.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (agents.length === 0) return null;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose which Tro gets this message"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-line bg-sunk/70 py-1 pl-1 pr-2 text-[12.5px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        {selected ? (
          <span className="relative">
            {workingIds.has(selected.id) ? (
              <span className="absolute -right-px -top-px z-10 size-2 rounded-full bg-blue-500 ring-2 ring-[#101013]" />
            ) : null}
            <Bot size={22} seed={selected.id} accent={selected.accent} state="idle" />
          </span>
        ) : null}
        <span className="max-w-[110px] truncate">{selected?.name ?? "Tro"}</span>
        <Ico icon={FiChevronDown} size={13} className={cn("text-ink-4 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-2 max-h-[280px] w-[240px] overflow-y-auto rounded-2xl border border-line-strong bg-[#141416] p-1.5 shadow-2xl shadow-black/60"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">
            Send to
          </p>
          {agents.map((a) => {
            const active = a.id === value;
            const working = workingIds.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                  active ? "bg-violet-500/15" : "hover:bg-white/[0.06]",
                )}
              >
                <span className="relative shrink-0">
                  {working ? (
                    <span className="absolute -right-px -top-px z-10 size-2 rounded-full bg-blue-500 ring-2 ring-[#141416]" />
                  ) : null}
                  <Bot size={28} seed={a.id} accent={a.accent} state="idle" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{a.name}</span>
                  <span className="block truncate text-[11px] text-ink-4">
                    {working ? "Working now" : a.role || "Specialist"}
                  </span>
                </span>
                {active ? <Ico icon={FiCheck} size={14} className="shrink-0 text-violet-500" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
