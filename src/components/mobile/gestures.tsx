"use client";

/**
 * Mobile gesture utilities — the web-feasible subset of the native gesture
 * language. Three hooks:
 *
 * - `useSwipeBack` — swipe right from the left edge to go back. The page
 *   follows the finger; a hint layer peeks in behind it with parallax
 *   (the web cannot snapshot the real previous page, so the parallax is a
 *   back-hint panel, not the previous route).
 * - `useSheetZoom` — while a bottom sheet is open, the background page zooms
 *   slightly out (scale + rounded corners); on dismiss it zooms back in.
 *   Written as a hook so any sheet component can opt in by spreading
 *   `backgroundProps` onto its page wrapper.
 * - `useLongPress` — long-press as right-click: blurred dimmed backdrop,
 *   an actions menu anchored to the pressed item, and a slight zoom on the
 *   item itself.
 *
 * All three are interruptible (a new gesture cancels an in-flight settle
 * animation; menus dismiss on scroll/resize/Escape/backdrop tap) and inert
 * under `prefers-reduced-motion` (no transforms, same end state).
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* shared                                                              */
/* ------------------------------------------------------------------ */

/** True when the OS asks for reduced motion. All gestures degrade to their
 *  end state with no animation when this is on. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/* ------------------------------------------------------------------ */
/* useSwipeBack                                                        */
/* ------------------------------------------------------------------ */

export type SwipeBackOptions = {
  /** Called when the gesture commits (or when an edge swipe passes the
   *  threshold under reduced motion). Typically `() => router.back()`. */
  onBack: () => void;
  /** Horizontal zone from the left edge where a gesture may start, in px. */
  edgeZone?: number;
  /** Fraction of viewport width that commits the back navigation. */
  commitFraction?: number;
  disabled?: boolean;
};

/**
 * Swipe-right-from-left-edge to go back, with the page tracking the finger
 * and a back-hint panel sliding in behind it at a parallax lag.
 *
 * Wrap the page in `<div ref={contentRef}>…</div>` and render `hint` next to
 * it. The gesture only starts inside `edgeZone` so horizontal carousels and
 * in-page swipes keep working; a vertical drift beyond 10px hands control
 * back to scrolling.
 */
export function useSwipeBack({
  onBack,
  edgeZone = 28,
  commitFraction = 0.32,
  disabled = false,
}: SwipeBackOptions): {
  contentRef: React.RefObject<HTMLDivElement | null>;
  hint: React.ReactNode;
} {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const hintRef = React.useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const mounted = useMounted();
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;
  const gesture = React.useRef<{
    id: number;
    startX: number;
    startY: number;
    locked: boolean;
    dx: number;
  } | null>(null);
  const commitTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el || disabled) return;

    const width = () => window.innerWidth;

    const paintContent = (dx: number, animate: boolean) => {
      el.style.transition = animate
        ? "transform 200ms cubic-bezier(0.22,1,0.36,1)"
        : "none";
      el.style.transform = dx > 0 ? `translate3d(${dx}px,0,0)` : "";
      el.style.willChange = dx > 0 ? "transform" : "";
    };

    /** The hint lags the finger — that's the parallax. */
    const paintHint = (progress: number) => {
      const hint = hintRef.current;
      if (!hint) return;
      const p = Math.max(0, Math.min(1, progress));
      hint.style.opacity = p > 0.02 ? String(Math.min(1, p * 1.5)) : "0";
      hint.style.transform = `translate3d(${(p - 1) * 72}px,0,0)`;
    };

    /** Temporarily lift the page above the hint layer while dragging. */
    const lift = (on: boolean) => {
      el.style.position = on ? "relative" : "";
      el.style.zIndex = on ? "10" : "";
    };

    const settle = (dx: number) => {
      // Called after a release or cancel — restores the page.
      paintContent(dx, true);
      if (dx === 0) {
        window.setTimeout(() => {
          if (!gesture.current) {
            paintContent(0, false);
            paintHint(0);
            lift(false);
          }
        }, 210);
      } else {
        paintHint(0);
      }
    };

    const currentDx = () => {
      const t = window.getComputedStyle(el).transform;
      if (!t || t === "none") return 0;
      const m = t.match(/matrix(?:3d)?\((.+)\)/);
      if (!m) return 0;
      const parts = m[1].split(",").map(Number);
      return parts.length === 16 ? parts[12] || 0 : parts[4] || 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (gesture.current) return;
      const t = e.changedTouches[0];
      if (t.clientX > edgeZone) return;
      // Interruptible: a fresh touch during a snap-back resumes from the
      // current position instead of jumping.
      if (commitTimer.current !== null) {
        window.clearTimeout(commitTimer.current);
        commitTimer.current = null;
      }
      const dx = currentDx();
      paintContent(dx, false);
      lift(true);
      gesture.current = {
        id: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        locked: dx > 0,
        dx,
      };
      if (dx > 0) paintHint(Math.min(1, dx / (width() * commitFraction)));
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gesture.current;
      if (!g) return;
      let t: Touch | null = null;
      for (const c of Array.from(e.changedTouches)) {
        if (c.identifier === g.id) t = c;
      }
      if (!t) return;
      const rawDx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;
      if (!g.locked) {
        // Direction lock: vertical drift hands the gesture to scrolling.
        if (Math.abs(dy) > Math.abs(rawDx) + 10) {
          gesture.current = null;
          paintHint(0);
          lift(false);
          return;
        }
        if (rawDx < 8) return;
        g.locked = true;
      }
      // Once locked, own the gesture so the page doesn't rubber-band scroll.
      e.preventDefault();
      const dx = Math.max(0, rawDx);
      g.dx = dx;
      if (!reduce) {
        paintContent(dx, false);
        paintHint(dx / (width() * commitFraction));
      }
    };

    const finish = (cancelled: boolean) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || !g.locked) {
        paintHint(0);
        lift(false);
        return;
      }
      const threshold = Math.max(110, width() * commitFraction);
      if (!cancelled && g.dx >= threshold) {
        // Commit: page exits right, then navigate. Under reduced motion the
        // exit animation is skipped and we navigate directly.
        if (reduce) {
          paintHint(0);
          lift(false);
          onBackRef.current();
        } else {
          paintContent(width(), true);
          paintHint(1);
          commitTimer.current = window.setTimeout(() => {
            commitTimer.current = null;
            onBackRef.current();
          }, 210);
        }
      } else {
        settle(0);
      }
    };

    const onEnd = () => finish(false);
    const onCancel = () => finish(true);

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
      if (commitTimer.current !== null) {
        window.clearTimeout(commitTimer.current);
        commitTimer.current = null;
      }
    };
  }, [disabled, edgeZone, commitFraction, reduce]);

  const hint =
    mounted && !disabled
      ? createPortal(
          <div
            ref={hintRef}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[5]"
            style={{ opacity: 0 }}
          >
            <div className="flex h-full w-[42%] flex-col justify-center gap-1 bg-canvas pl-7">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-ink-3)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-[13px] font-medium text-ink-3">Back</span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { contentRef, hint };
}

/* ------------------------------------------------------------------ */
/* useSheetZoom                                                        */
/* ------------------------------------------------------------------ */

export type SheetZoomOptions = {
  /** Background scale while the sheet is open. */
  scale?: number;
  /** Corner radius applied to the background while the sheet is open. */
  radius?: number;
};

/**
 * Bottom sheets zoom the background out on open and back in on dismiss.
 * Spread `backgroundProps` onto the page/content wrapper that sits behind
 * the sheet:
 *
 *   const sheet = useSheetZoom(sheetOpen);
 *   <main {...sheet.backgroundProps}>…page…</main>
 *   <BottomSheet open={sheetOpen} … />
 *
 * The transition retargets mid-flight, so rapid open/dismiss stays smooth.
 * Note: scaling makes the wrapper a containing block, so fixed-position
 * elements inside it scale with the background — which is the desired
 * "recede under the sheet" effect. Keep the sheet itself in a portal.
 */
export function useSheetZoom(
  open: boolean,
  { scale = 0.94, radius = 20 }: SheetZoomOptions = {},
): { backgroundProps: React.HTMLAttributes<HTMLElement> } {
  const reduce = usePrefersReducedMotion();

  const backgroundProps = React.useMemo<React.HTMLAttributes<HTMLElement>>(
    () => ({
      style: reduce
        ? undefined
        : {
            transform: open ? `scale(${scale})` : "scale(1)",
            borderRadius: open ? radius : 0,
            overflow: open ? "hidden" : undefined,
            transformOrigin: "50% 100%",
            transition:
              "transform 300ms cubic-bezier(0.22,1,0.36,1), border-radius 300ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "transform",
          },
    }),
    [open, scale, radius, reduce],
  );

  return { backgroundProps };
}

/* ------------------------------------------------------------------ */
/* useLongPress                                                        */
/* ------------------------------------------------------------------ */

export type LongPressAction = {
  id: string;
  label: string;
  hint?: string;
  destructive?: boolean;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  onSelect: (itemId: string) => void;
};

export type UseLongPressOptions = {
  /** Static list, or a function resolving actions for the pressed item. */
  actions: LongPressAction[] | ((itemId: string) => LongPressAction[]);
  /** Hold duration before the menu appears. */
  durationMs?: number;
  disabled?: boolean;
  /**
   * Default true — desktop users have right-click; long-press is the touch
   * equivalent, so mouse pointers are ignored unless this is false.
   */
  coarseOnly?: boolean;
};

type ItemProps = {
  ref: (node: HTMLElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.SyntheticEvent) => void;
  onClickCapture: (e: React.SyntheticEvent) => void;
};

/**
 * Long-press as right-click for cards/items. While held, the pressed element
 * zooms up slightly; on release-of-patience (after `durationMs`) a blurred
 * backdrop fades in with an actions menu anchored to the item.
 *
 *   const lp = useLongPress({ actions: [...] });
 *   <article {...lp.itemProps(item.id)}>…</article>
 *   {lp.menu}
 *
 * The tap that follows a long-press is swallowed (capture phase) so links
 * inside the item don't navigate. Dragging more than 14px cancels — the
 * gesture never fights scrolling.
 */
export function useLongPress({
  actions,
  durationMs = 480,
  disabled = false,
  coarseOnly = true,
}: UseLongPressOptions): {
  itemProps: (itemId: string) => ItemProps | Record<string, never>;
  menu: React.ReactNode;
  activeId: string | null;
  dismiss: () => void;
} {
  const reduce = usePrefersReducedMotion();
  const mounted = useMounted();
  const [active, setActive] = React.useState<{
    id: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [entered, setEntered] = React.useState(false);

  const els = React.useRef(new Map<string, HTMLElement>());
  const gesture = React.useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const timer = React.useRef<number | null>(null);
  const activated = React.useRef(false);
  const swallowNextClick = React.useRef(false);
  const suppressContext = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = React.useCallback(() => {
    setActive(null);
  }, []);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  const fire = React.useCallback(
    (itemId: string) => {
      const el = els.current.get(itemId);
      if (!el) return;
      timer.current = null;
      activated.current = true;
      // Swallow the click that follows this gesture (capture phase on the
      // item) so links/buttons inside don't fire.
      swallowNextClick.current = true;
      const r = el.getBoundingClientRect();
      setActive({
        id: itemId,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      });
      try {
        navigator.vibrate?.(12);
      } catch {
        /* vibrate is best-effort */
      }
    },
    [],
  );

  const itemProps = React.useCallback(
    (itemId: string): ItemProps | Record<string, never> => {
      if (disabled) return {};
      return {
        ref: (node: HTMLElement | null) => {
          if (node) els.current.set(itemId, node);
          else els.current.delete(itemId);
        },
        onPointerDown: (e: React.PointerEvent) => {
          if (coarseOnly && e.pointerType === "mouse") return;
          if (!e.isPrimary) return;
          gesture.current = {
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
          };
          activated.current = false;
          suppressContext.current = true;
          clearTimer();
          timer.current = window.setTimeout(() => fire(itemId), durationMs);
        },
        onPointerMove: (e: React.PointerEvent) => {
          const g = gesture.current;
          if (!g || e.pointerId !== g.pointerId) return;
          // Moved too far: this is a scroll/drag, not a press. Cancel.
          if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 14) {
            gesture.current = null;
            suppressContext.current = false;
            clearTimer();
          }
        },
        onPointerUp: (e: React.PointerEvent) => {
          if (gesture.current?.pointerId === e.pointerId) {
            gesture.current = null;
            suppressContext.current = false;
            clearTimer();
          }
        },
        onPointerCancel: (e: React.PointerEvent) => {
          if (gesture.current?.pointerId === e.pointerId) {
            gesture.current = null;
            suppressContext.current = false;
            clearTimer();
          }
        },
        onContextMenu: (e: React.SyntheticEvent) => {
          if (suppressContext.current) e.preventDefault();
        },
        onClickCapture: (e: React.SyntheticEvent) => {
          if (swallowNextClick.current) {
            e.preventDefault();
            e.stopPropagation();
            swallowNextClick.current = false;
          }
        },
      };
    },
    [disabled, coarseOnly, durationMs, fire, clearTimer],
  );

  // Slight zoom on the pressed element while the menu is open.
  React.useEffect(() => {
    if (!active || reduce) return;
    const el = els.current.get(active.id);
    if (!el) return;
    const prevTransition = el.style.transition;
    const prevTransform = el.style.transform;
    el.style.transition = "transform 180ms cubic-bezier(0.22,1,0.36,1)";
    el.style.transform = "scale(1.045)";
    return () => {
      el.style.transition = prevTransition;
      el.style.transform = prevTransform;
    };
  }, [active, reduce]);

  // Entrance: two rAFs so the transition has a start frame. Skipped under
  // reduced motion.
  React.useEffect(() => {
    if (!active) {
      setEntered(false);
      return;
    }
    if (reduce) {
      setEntered(true);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setEntered(false);
    };
  }, [active, reduce]);

  // Dismiss on Escape, scroll (position would go stale), or resize.
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    const onScroll = () => dismiss();
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [active, dismiss]);

  const menu = (() => {
    if (!mounted || !active) return null;
    const list =
      typeof actions === "function" ? actions(active.id) : actions;
    if (list.length === 0) return null;

    const vw = window.innerWidth;
    const menuW = 264;
    const above = active.rect.top > 280;
    const left = Math.min(
      Math.max(8, active.rect.left + active.rect.width / 2 - menuW / 2),
      Math.max(8, vw - menuW - 8),
    );
    const top = above ? active.rect.top - 12 : active.rect.top + active.rect.height + 12;
    const transform = above
      ? `translateY(-100%) scale(${entered ? 1 : 0.96})`
      : `scale(${entered ? 1 : 0.96})`;

    return createPortal(
      <>
        <div
          aria-hidden
          onClick={dismiss}
          className={cn(
            "fixed inset-0 z-[300] bg-ground/60 backdrop-blur-[6px]",
            !reduce && "transition-opacity duration-200",
          )}
          style={{ opacity: entered ? 1 : 0 }}
        />
        <div
          role="menu"
          aria-label="Item actions"
          className={cn(
            "fixed z-[301] overflow-hidden rounded-2xl border border-line bg-raised",
            "shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)]",
            !reduce && "transition-all duration-200",
          )}
          style={{
            left,
            top,
            width: menuW,
            transform,
            transformOrigin: above ? "50% 100%" : "50% 0%",
            opacity: entered ? 1 : 0,
          }}
        >
          {list.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  a.onSelect(active.id);
                  dismiss();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-hover",
                  a.destructive ? "text-critical" : "text-ink",
                )}
              >
                {Icon ? <Icon size={16} className="shrink-0" /> : null}
                <span className="flex-1">{a.label}</span>
                {a.hint ? (
                  <span className="text-[12px] font-normal text-ink-4">
                    {a.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </>,
      document.body,
    );
  })();

  return { itemProps, menu, activeId: active?.id ?? null, dismiss };
}
