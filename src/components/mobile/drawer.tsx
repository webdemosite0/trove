"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * The navigation panel, sliding in from the left edge.
 *
 * Replaces the bottom tab bar. A tab bar can hold four destinations; this app
 * has sixteen, and the four that fit were chosen by guessing which ones matter
 * — a drawer just shows them all, which is the honest answer when the list is
 * that long and that flat.
 *
 * Dragging left past a third of its width closes it, matching the direction it
 * arrived from. The threshold is on distance rather than velocity so a flick
 * and a slow drag need the same commitment.
 */
export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const [drag, setDrag] = React.useState(0);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open || !mounted) return;
    const { body } = document;
    const prev = body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    body.style.overflow = "hidden";
    const background = Array.from(body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(panel.current),
    ).map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    const controls = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    (controls()[0] ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) { e.preventDefault(); panel.current?.focus(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev;
      background.forEach(({ element, inert }) => { element.inert = inert; });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, mounted, onClose]);

  // Adjusted during render rather than in an effect: an effect here is a
  // setState-in-effect cascade, and this is the pattern React documents for
  // state derived from a prop changing.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDrag(0);
  }

  if (!mounted || !open) return null;

  const finish = () => {
    const width = panel.current?.offsetWidth ?? 1;
    if (-drag > width / 3) onClose();
    else setDrag(0);
    start.current = null;
  };

  return createPortal(
    <div className="nx-no-print fixed inset-0 z-[120] flex">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="nx-fade absolute inset-0 cursor-default bg-[rgba(4,5,10,0.66)]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        style={{ transform: drag ? `translateX(${drag}px)` : undefined }}
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchMove={(e) => {
          if (start.current === null) return;
          const delta = e.touches[0].clientX - start.current.x;
          const vertical = e.touches[0].clientY - start.current.y;
          if (Math.abs(vertical) > Math.abs(delta)) { start.current = null; setDrag(0); return; }
          // Leftward only — dragging right should not stretch the panel.
          if (delta < 0) setDrag(delta);
        }}
        onTouchEnd={finish}
        onTouchCancel={finish}
        className={cn(
          "nx-mobile-drawer nx-drawer-in relative flex h-dvh w-[min(88vw,340px)] flex-col overflow-hidden border-r border-line bg-rail outline-none",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          drag ? "transition-none" : "transition-transform duration-[var(--t-hover)]",
        )}
      >
        <button type="button" onClick={onClose} aria-label="Close navigation" className="absolute right-3 top-[calc(env(safe-area-inset-top)+8px)] z-10 grid size-11 place-items-center rounded-full bg-raised text-ink">×</button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
