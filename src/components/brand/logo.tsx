"use client";

import { cn } from "@/lib/utils";
import { TROVE_ICON_512 } from "@/components/brand/assets";

/**
 * Official Trove brand mark (exact PNG from your brand pack).
 */
export function TroveIcon({
  size = 28,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TROVE_ICON_512}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/**
 * Official wordmark — uses the real brand weight / tracking.
 * (PNG wordmarks can be swapped in when served from /public/brand/)
 */
export function Wordmark({
  className,
  size = 20,
  sweep = true,
}: {
  className?: string;
  size?: number;
  sweep?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center leading-none text-ink",
        sweep && "nx-sweep-text",
        className,
      )}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      Trove
    </span>
  );
}

/** Official icon + wordmark for nav, sidebar, landing, auth. */
export function BrandLockup({
  className,
  orbSize = 28,
  wordSize = 20,
  showWord = true,
  showOrb = true,
  sweep = false,
  priority = false,
}: {
  className?: string;
  orbSize?: number;
  wordSize?: number;
  state?: string;
  showWord?: boolean;
  showOrb?: boolean;
  sweep?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showOrb ? <TroveIcon size={orbSize} priority={priority} /> : null}
      {showWord ? <Wordmark size={wordSize} sweep={sweep} /> : null}
    </span>
  );
}
