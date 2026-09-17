"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BeamSize = "sm" | "md" | "lg" | "line" | "pulse-inner" | "pulse-outside";
type BeamVariant = "colorful" | "ocean" | "mono" | "sunset";

const gradientByVariant: Record<BeamVariant, string> = {
  colorful:
    "conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(124,58,237,.2) 265deg, rgba(59,130,246,1) 300deg, rgba(168,85,247,.95) 328deg, transparent 360deg)",
  ocean:
    "conic-gradient(from 0deg, transparent 0deg, transparent 235deg, rgba(14,165,233,.22) 270deg, rgba(59,130,246,1) 308deg, rgba(125,211,252,.9) 335deg, transparent 360deg)",
  mono:
    "conic-gradient(from 0deg, transparent 0deg, transparent 240deg, rgba(15,23,42,.14) 278deg, rgba(15,23,42,.7) 315deg, rgba(255,255,255,.78) 340deg, transparent 360deg)",
  sunset:
    "conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(249,115,22,.2) 265deg, rgba(244,63,94,.95) 300deg, rgba(168,85,247,.85) 330deg, transparent 360deg)",
};

/** Trove-owned BorderBeam — animated edge glow for composer / plan / steps. */
export function BorderBeam({
  children,
  size = "md",
  colorVariant = "colorful",
  strength = 0.55,
  active = true,
  className,
}: {
  children: ReactNode;
  size?: BeamSize;
  colorVariant?: BeamVariant;
  strength?: number;
  active?: boolean;
  theme?: "auto" | "light" | "dark";
  className?: string;
}) {
  const pad =
    size === "lg" || size === "pulse-outside"
      ? 2.25
      : size === "line"
        ? 1
        : 1.4;
  const inset =
    size === "sm" || size === "line"
      ? "-1px"
      : size === "lg" || size === "pulse-outside"
        ? "-2px"
        : "-1.5px";
  const opacity = active ? Math.max(0.2, Math.min(1, strength)) : 0;
  const duration =
    size === "pulse-inner" || size === "pulse-outside" ? "3.2s" : "4.6s";

  return (
    <div className={cn("relative isolate rounded-[inherit]", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-[inherit] transition-opacity duration-300"
        style={{
          inset,
          opacity,
          padding: pad,
          background: gradientByVariant[colorVariant] ?? gradientByVariant.colorful,
          animation: active ? `spin ${duration} linear infinite` : undefined,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          filter: active ? `blur(${size === "line" ? 0.2 : 0.4}px)` : undefined,
        }}
      />
      <div className="relative z-[1] rounded-[inherit]">{children}</div>
    </div>
  );
}
