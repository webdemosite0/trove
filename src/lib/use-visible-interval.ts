"use client";

import { useEffect, useRef } from "react";

/**
 * Interval that pauses while the tab is hidden and fires immediately when
 * the tab becomes visible again. Drop-in replacement for setInterval in
 * polling loops — avoids wasted network requests from background tabs.
 *
 * The callback is stored in a ref so it never goes stale; the interval only
 * restarts when `ms` or `enabled` changes.
 */
export function useVisibleInterval(
  callback: () => void,
  ms: number,
  enabled = true,
) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled || ms <= 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const tick = () => {
      if (!cancelled) cbRef.current();
    };
    const start = () => {
      if (cancelled || timer !== null) return;
      // Fire right away on (re)start so returning tabs refresh instantly.
      tick();
      timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms, enabled]);
}
