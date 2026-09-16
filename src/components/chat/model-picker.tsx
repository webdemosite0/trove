"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { ModelMark } from "@/components/chat/model-mark";
import {
  AUTO_CHAT_MODEL,
  type ChatModelId,
  type ChatModelOption,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";

export function ModelPicker({
  value,
  options,
  onChange,
  disabled,
  compact = false,
  touch = false,
}: {
  value: ChatModelId;
  options: ChatModelOption[];
  onChange: (id: ChatModelId) => void;
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

  const visible = options.length ? options : [AUTO_CHAT_MODEL];
  const active = useMemo(
    () => visible.find((model) => model.id === value) ?? visible[0] ?? AUTO_CHAT_MODEL,
    [visible, value],
  );

  function place() {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuW = Math.min(330, window.innerWidth - 16);
    let left = r.left;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (left < 8) left = 8;
    // Prefer above the trigger; if not enough room, open below.
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const preferAbove = spaceAbove >= 280 || spaceAbove > spaceBelow;
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
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
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
  }, [open]);

  function step(from: number, delta: number) {
    const n = visible.length;
    items.current[(from + delta + n) % n]?.focus();
  }

  const panel = open ? (
    <div
      ref={menu}
      role="menu"
      onKeyDown={(event) => {
        const index = items.current.indexOf(event.target as HTMLButtonElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          step(index, 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          step(index, -1);
        } else if (event.key === "Home") {
          event.preventDefault();
          items.current[0]?.focus();
        } else if (event.key === "End") {
          event.preventDefault();
          items.current[visible.length - 1]?.focus();
        }
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
              // If we opened above, anchor bottom edge to trigger top.
              ...(coords.top <= (trigger.current?.getBoundingClientRect().top ?? 0)
                ? { bottom: window.innerHeight - coords.top, top: "auto" as const }
                : { top: coords.top }),
              maxHeight: "min(360px, calc(100vh - 24px))",
            }
      }
    >
      <div className="border-b border-line bg-sunk/40 px-3.5 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Model</p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          Pick a configured model. Auto keeps Trove's fallback chain.
        </p>
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {visible.map((model, index) => {
          const checked = model.id === active.id;
          return (
            <button
              key={model.id}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
                trigger.current?.focus();
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                checked ? "bg-accent-soft/60" : "hover:bg-hover",
              )}
            >
              <ModelMark brand={model.brand} size={34} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{model.label}</span>
                  {model.id === "auto" ? (
                    <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-accent">
                      Recommended
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-ink-4">
                  {model.provider}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">
                  {model.blurb}
                </span>
              </span>
              {checked ? (
                <Ico icon={FiCheck} motion="check" size={14} className="shrink-0 text-accent" />
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
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Model: ${active.label}`}
        className={cn(
          "tap-44 group flex items-center rounded-full border border-transparent text-ink-3 transition-all",
          "hover:border-line hover:bg-hover hover:text-ink disabled:opacity-40",
          open && "border-line bg-hover text-ink",
          touch
            ? "h-11 gap-1.5 px-2.5"
            : compact
              ? "gap-1 px-1.5 py-1 text-[11.5px]"
              : "gap-1.5 px-2 py-1.5 text-[12.5px]",
        )}
      >
        <ModelMark brand={active.brand} size={touch ? 26 : compact ? 20 : 24} />
        <span
          className={cn(
            "max-w-[112px] truncate font-medium",
            touch ? "hidden min-[390px]:inline" : "hidden sm:inline",
          )}
        >
          {active.label}
        </span>
        <FiChevronDown
          size={12}
          className={cn("text-ink-4 transition-transform", open && "rotate-180")}
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
