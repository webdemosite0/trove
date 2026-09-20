"use client";

import { useEffect } from "react";

/** Keep docked controls above the on-screen keyboard without disabling zoom. */
export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--mobile-viewport-height");
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      if (media.matches && Math.abs(viewport.scale - 1) < 0.05) {
        root.style.setProperty("--mobile-viewport-height", `${viewport.height}px`);
      } else if (!media.matches) {
        root.style.removeProperty("--mobile-viewport-height");
      }
    };
    update();
    viewport.addEventListener("resize", update);
    media.addEventListener("change", update);
    return () => {
      viewport.removeEventListener("resize", update);
      media.removeEventListener("change", update);
      if (previous) root.style.setProperty("--mobile-viewport-height", previous);
      else root.style.removeProperty("--mobile-viewport-height");
    };
  }, []);
  return null;
}
