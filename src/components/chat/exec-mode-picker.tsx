"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiCheck, FiZap, FiListChecks } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type ExecMode = "execute" | "plan";

const OPTIONS: {
  id: ExecMode;
  label: string;
  blurb: string;
}[] = [
  {
    id: "execute",
    label: "Execute",
    blurb: "The Tro takes real actions — sends, books, creates, edits.",
  },
  {
    id: "plan",
    label: "Plan",
    blurb: "Lays out a step-by-step plan and asks for approval before acting.",
  },
];

const ICON = { execute: FiZap, plan: FiListChecks } as const;

/**
 * Execute / Plan picker for the Tro composer. "Execute" is the Tro's normal
 * behavior (real actions via tools); "Plan" tells the Tro to plan only and
 * ask for approval before doing anything.
 */
export function ExecModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ExecMode;
  onChange: (mode: ExecMode) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  function place() {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuW = 300;
    let left = r.left;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (left < 8) left = 8;
    setCoords({ left, bottom: window.innerHeight - r.top + 8, width: menuW });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const Glyph = ICON[value];

  const panel = open ? (
    <div
      ref={menu}
      role="menu"
      aria-label="Execution mode"
      onKeyDown={(e) => {
        const i = items.current.indexOf(e.target as HTMLButtonElement);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          items.current[(i + 1) % OPTIONS.length]?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          items.current[(i - 1 + OPTIONS.length) % OPTIONS.length]?.focus();
        } else if (e.key === "Tab") setOpen(false);
      }}
      className="nx-in fixed z-[200] overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
      style={
        coords
          ? { left: coords.left, bottom: coords.bottom, width: coords.width }
          : undefined
      }
    >
      <div className="border-b border-line px-3.5 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
          Execution mode
        </p>
      </div>
      <div className="py-1">
        {OPTIONS.map((o, i) => {
          const active = o.id === value;
          const Icon = ICON[o.id];
          return (
            <button
              key={o.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
                trigger.current?.focus();
              }}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                active ? "bg-ink/[0.06]" : "hover:bg-ink/[0.04]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                  active ? "bg-accent text-white shadow-sm" : "bg-ink/[0.06] text-ink-2",
                )}
              >
                <Icon size={15} className={active ? "text-white" : "text-ink-2"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">{o.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{o.blurb}</span>
              </span>
              {active ? (
                <FiCheck size={14} className="mt-1.5 shrink-0 text-accent" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Execution mode"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 text-[12.5px] text-ink-3 transition-all",
          "hover:border-line hover:bg-ink/[0.05] hover:text-ink disabled:opacity-40",
          open && "border-line bg-ink/[0.05] text-ink",
        )}
      >
        <span className="grid size-6 place-items-center rounded-full bg-ink/[0.07] text-ink-2">
          <Glyph size={13} />
        </span>
        <span className="font-medium">{value === "execute" ? "Execute" : "Plan"}</span>
        <FiChevronDown
          size={12}
          className={cn("text-ink-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
