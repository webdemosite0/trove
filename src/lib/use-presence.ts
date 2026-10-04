"use client";

import { useCallback, useState } from "react";
import { useVisibleInterval } from "./use-visible-interval";

/** Live set of Tro ids currently working (polled from /api/tro/presence). */
export function useTroPresence(enabled = true, intervalMs = 15000): Set<string> {
  const [working, setWorking] = useState<Set<string>>(() => new Set());

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/tro/presence", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.working)) {
        setWorking(new Set<string>(data.working.map(String)));
      }
    } catch {
      /* presence is best-effort */
    }
  }, []);

  // Pauses while the tab is hidden; refreshes immediately on return.
  useVisibleInterval(poll, intervalMs, enabled);

  return working;
}
