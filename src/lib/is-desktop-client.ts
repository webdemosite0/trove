"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    troveDesktop?: { kind?: string; platform?: string };
  }
}

/** True when running inside the Trove Desktop (Electron) shell. */
export function useIsDesktopClient(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    setDesktop(Boolean(window.troveDesktop?.kind === "electron" || window.troveDesktop));
  }, []);
  return desktop;
}
