"use client";

import { TroveOrb } from "@/components/brand/orb";
import type { ModelBrand } from "@/lib/chat-models";
import { cn } from "@/lib/utils";

export function ModelMark({
  brand,
  size = 24,
  className,
}: {
  brand: ModelBrand;
  size?: number;
  className?: string;
}) {
  if (brand === "trove") {
    return (
      <span
        aria-hidden
        className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-[8px]", className)}
        style={{ width: size, height: size }}
      >
        <TroveOrb size={Math.max(16, Math.round(size * 0.86))} sweep={false} />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-[8px] border border-black/[0.06] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,.45)] dark:border-white/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <ModelSvg brand={brand} size={Math.round(size * 0.72)} />
    </span>
  );
}

function ModelSvg({ brand, size }: { brand: Exclude<ModelBrand, "trove">; size: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };

  switch (brand) {
    case "gemini":
      return (
        <svg {...p}>
          <defs>
            <linearGradient id="trove-gemini" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1A73E8" />
              <stop offset=".48" stopColor="#8867E8" />
              <stop offset="1" stopColor="#D96570" />
            </linearGradient>
          </defs>
          <path
            fill="url(#trove-gemini)"
            d="M12 2.3c.7 5.3 4.4 9 9.7 9.7-5.3.7-9 4.4-9.7 9.7-.7-5.3-4.4-9-9.7-9.7 5.3-.7 9-4.4 9.7-9.7Z"
          />
        </svg>
      );
    case "xai":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#050505" />
          <path d="m7 17 9.8-10M8 7h3.7l5.5 10H14L8 7Z" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "qwen":
      return (
        <svg {...p}>
          <defs>
            <linearGradient id="trove-qwen" x1="5" y1="20" x2="19" y2="4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#725CFF" />
              <stop offset="1" stopColor="#B15CFF" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="10" fill="url(#trove-qwen)" />
          <path d="M7.2 12a4.8 4.8 0 1 1 8.5 3l1.8 1.8M9.2 9.2c1.6-1.6 4.1-1.6 5.6 0s1.6 4.1 0 5.6" fill="none" stroke="#fff" strokeWidth="1.65" strokeLinecap="round" />
        </svg>
      );
    case "openrouter":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#111114" />
          <path d="M5.5 8.2h8.2l-2-2M13.7 8.2l-2 2M18.5 15.8h-8.2l2-2M10.3 15.8l2 2" fill="none" stroke="#fff" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "puter":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#5B6CFF" />
          <path d="M8 18V6h5.1a4 4 0 0 1 0 8H10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "experiential":
      return (
        <svg {...p}>
          <defs>
            <linearGradient id="trove-explabs" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6D5DFB" />
              <stop offset="1" stopColor="#1EA7FF" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#trove-explabs)" />
          <path d="M7 7.2h10M7 12h7.2M7 16.8h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}
