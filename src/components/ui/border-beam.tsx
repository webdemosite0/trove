"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BeamSize = "sm" | "md" | "lg";
type BeamVariant = "colorful" | "ocean" | "mono";

const gradientByVariant: Record<BeamVariant, string> = {
  colorful:
    "conic-gradient(from 0deg, transparent 0deg, transparent 245deg, rgba(124,58,237,.15) 275deg, rgba(59,130,246,.95) 305deg, rgba(168,85,247,.9) 330deg, transparent 360deg)",
  ocean:
    "conic-gradient(from 0deg, transparent 0deg, transparent 250deg, rgba(14,165,233,.18) 280deg, rgba(59,130,246,.95) 315deg, rgba(125,211,252,.82) 338deg, transparent 360deg)",
  mono:
    "conic-gradient(from 0deg, transparent 0deg, transparent 255deg, rgba(15,23,42,.12) 286deg, rgba(15,23,42,.65) 320deg, rgba(255,255,255,.72) 340deg, transparent 360deg)",
};

/** Lightweight Trove-owned replacement for the old border-beam package. */
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
  const inset = size === "sm" ? "-1px" : size === "lg" ? "-2px" : "-1.5px";
  const opacity = active ? Math.max(0.18, Math.min(1, strength)) : 0;

  return (
    <div className={cn("relative isolate rounded-[inherit]", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-[inherit] transition-opacity duration-300"
        style={{
          inset,
          opacity,
          padding: size === "lg" ? 2 : 1.25,
          background: gradientByVariant[colorVariant],
          animation: active ? "spin 4.8s linear infinite" : undefined,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-[1] rounded-[inherit]">{children}</div>
    </div>
  );
}
