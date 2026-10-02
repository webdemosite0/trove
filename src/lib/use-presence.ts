"use client";

import { useEffect, useState } from "react";

/** Live set of Tro ids currently working (polled from /api/tro/presence). */
export function useTroPresence(enabled = true, intervalMs = 15000): Set<string> {
  const [working, setWorking] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/tro/presence", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(data?.working)) {
          setWorking(new Set<string>(data.working.map(String)));
        }
      } catch {
        /* presence is best-effort */
      }
    };
    void poll();
    const iv = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [enabled, intervalMs]);
  return working;
}
