"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BeamSize = "sm" | "md" | "lg" | "line" | "pulse-inner" | "pulse-outside";
type BeamVariant = "colorful" | "ocean" | "mono" | "sunset";

/**
 * Formerly an animated, colourful edge glow around the composer, plan and
 * steps panels. The clean & calm redesign drops the effect; this stays as a
 * plain wrapper so callers keep their props and layout.
 */
export function BorderBeam({
  children,
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
  return <div className={cn("relative", className)}>{children}</div>;
}
