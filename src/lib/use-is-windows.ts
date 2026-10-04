"use client";

import { useEffect, useState } from "react";

/** True when the browser is running on Windows (for platform-correct shortcut hints). */
export function useIsWindows(): boolean {
  const [isWin, setIsWin] = useState(false);
  useEffect(() => {
    const platform = navigator.platform || "";
    const ua = navigator.userAgent || "";
    setIsWin(/win/i.test(platform) || /windows nt/i.test(ua));
  }, []);
  return isWin;
}

/** "Ctrl+K" on Windows, "⌘K" elsewhere. */
export function useModKLabel(): string {
  return useIsWindows() ? "Ctrl+K" : "⌘K";
}
