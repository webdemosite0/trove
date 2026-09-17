"use client";

import { cn } from "@/lib/utils";
import "./orb.css";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * Official Trove mark supplied by the brand owner: black rounded tile,
 * electric-blue frame, and a white geometric T. The artwork stays visually
 * identical in every state; motion communicates activity without recoloring
 * the brand mark.
 */
export function TroveOrb({
  size = 28,
  state = "idle",
  className,
}: {
  size?: number;
  state?: OrbState;
  className?: string;
}) {
  const active = state === "thinking" || state === "working";
  const label = {
    idle: "Trove",
    thinking: "Trove is thinking",
    working: "Trove is working",
    done: "Complete",
    error: "Failed",
  }[state];

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        active && "trove-orb-breathe",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        fill="none"
        className="relative z-[1] block"
        aria-hidden
      >
        <rect
          x="47"
          y="48"
          width="418"
          height="416"
          rx="109"
          fill="#0B0B0C"
          stroke="#3B82F6"
          strokeWidth="14"
        />
        <rect x="151" y="173" width="210" height="43" rx="15" fill="#F7F8FA" />
        <rect x="228" y="205" width="56" height="158" rx="15" fill="#F7F8FA" />
      </svg>
    </span>
  );
}
