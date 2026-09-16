"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "@/components/ui/icons";
import {
  FiChevronDown,
  FiCheck,
  TbBolt,
  TbScale,
  TbTelescope,
  TbSparkles,
} from "@/components/ui/icons";
import { MODE_LIST, MODES, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

const ICON: Record<ModeId, IconType> = {
  fast: TbBolt,
  balanced: TbScale,
  deep: TbTelescope,
  creative: TbSparkles,
};

const CUE: Record<ModeId, string> = {
  fast: "Quick · lighter",
  balanced: "Default · solid",
  deep: "Thorough · slower",
  creative: "Bold · varied",
};

export function ModePicker({
  value,
  onChange,
  disabled,
  compact = false,
  touch = false,
}: {
  value: ModeId;
  onChange: (id: ModeId) => void;
  disabled?: boolean;
  compact?: boolean;
  touch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const landOn = useRef<number | null>(null);

  function openAt(index: number) {
    landOn.current = index;
    setOpen(true);
  }

  function place() {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuW = Math.min(300, window.innerWidth - 16);
    let left = r.left;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (left < 8) left = 8;
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const preferAbove = spaceAbove >= 240 || spaceAbove > spaceBelow;
    setCoords({
      top: preferAbove ? r.top - 8 : r.bottom + 8,
      left,
      width: menuW,
    });
  }

  useLayoutEffect(() => {
    if (!open || touch) return;
    place();
    const onScroll = () => place();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, touch]);

  useEffect(() => {
    if (!open || landOn.current === null) return;
    items.current[landOn.current]?.focus();
    landOn.current = null;
  }, [open]);

  function close({ restore = true } = {}) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }

  function step(from: number, delta: number) {
    const n = MODE_LIST.length;
    items.current[(from + delta + n) % n]?.focus();
  }

  const checkedIndex = Math.max(0, MODE_LIST.findIndex((m) => m.id === value));

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
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Glyph = ICON[value];

  const panel = open ? (
    <div
      ref={menu}
      role="menu"
      onKeyDown={(e) => {
        const i = items.current.indexOf(e.target as HTMLButtonElement);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          step(i, 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          step(i, -1);
        } else if (e.key === "Home") {
          e.preventDefault();
          items.current[0]?.focus();
        } else if (e.key === "End") {
          e.preventDefault();
          items.current[MODE_LIST.length - 1]?.focus();
        } else if (e.key === "Tab") close({ restore: false });
      }}
      className={cn(
        "nx-in z-[200] overflow-hidden border border-line bg-white shadow-xl dark:bg-raised",
        touch
          ? "fixed inset-x-3 bottom-3 rounded-[var(--r-card)]"
          : "fixed rounded-2xl",
      )}
      style={
        touch || !coords
          ? undefined
          : {
              left: coords.left,
              width: coords.width,
              ...(coords.top <= (trigger.current?.getBoundingClientRect().top ?? 0)
                ? { bottom: window.innerHeight - coords.top, top: "auto" as const }
                : { top: coords.top }),
              maxHeight: "min(320px, calc(100vh - 24px))",
            }
      }
    >
      <div className="border-b border-line bg-sunk/40 px-3.5 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
          Response style
        </p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          Changes temperature — not the model family.
        </p>
      </div>

      <div className="max-h-[280px] overflow-y-auto py-1">
        {MODE_LIST.map((m, i) => {
          const active = m.id === value;
          const Icon = ICON[m.id];
          return (
            <button
              key={m.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                onChange(m.id);
                close();
              }}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                active ? "bg-accent-soft/60" : "hover:bg-hover",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                  active ? "bg-accent text-white shadow-sm" : "bg-sunk text-ink",
                )}
              >
                <Icon size={15} className={active ? "text-white" : "text-ink"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[13.5px] font-semibold text-ink">{m.label}</span>
                  <span className="text-[11px] text-ink-4">{CUE[m.id]}</span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{m.blurb}</span>
              </span>
              {active ? (
                <Ico icon={FiCheck} motion="check" size={14} className="mt-1.5 shrink-0 text-accent" />
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
        onClick={() => (open ? close({ restore: false }) : openAt(checkedIndex))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openAt(open ? 0 : checkedIndex);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openAt(MODE_LIST.length - 1);
          }
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Response style"
        className={cn(
          "tap-44 group flex items-center gap-1.5 rounded-full border border-transparent text-ink-3 transition-all",
          "hover:border-line hover:bg-hover hover:text-ink disabled:opacity-40",
          open && "border-line bg-hover text-ink",
          touch
            ? "h-11 px-3.5 text-[13.5px]"
            : compact
              ? "px-2 py-1 text-[11.5px]"
              : "px-2.5 py-1.5 text-[12.5px]",
        )}
      >
        <span
          className={cn(
            "grid place-items-center rounded-full bg-sunk text-ink",
            touch || !compact ? "size-6" : "size-5",
          )}
        >
          <Glyph size={touch ? 14 : compact ? 11 : 13} className="text-ink" />
        </span>
        <span className={cn("font-medium", touch ? "" : "hidden sm:inline")}>
          {MODES[value].label}
        </span>
        <FiChevronDown
          size={12}
          className={cn(
            "text-ink-4 transition-transform duration-[var(--t-hover)] ease-[var(--ease-ui)]",
            open && "rotate-180",
          )}
        />
      </button>

      {open && touch ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="nx-fade fixed inset-0 z-[190] cursor-default bg-[rgba(4,5,10,0.55)] backdrop-blur-[2px]"
        />
      ) : null}

      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
