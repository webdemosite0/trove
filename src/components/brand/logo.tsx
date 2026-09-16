"use client";

import { cn } from "@/lib/utils";
import {
  TROVE_ICON_512,
  TROVE_WORDMARK_DARK,
  TROVE_WORDMARK_LIGHT,
} from "@/components/brand/assets";

/**
 * Real Trove brand marks — official PNGs embedded as data URIs
 * so every deploy ships the exact logos (landing, sidebar, auth).
 */

export function TroveIcon({
  size = 28,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  /** unused — kept for API parity with call sites */
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
 * Official wordmark — dark asset on light UI, light asset on dark UI.
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
  const height = size;
  const width = Math.round(size * 4.2);

  return (
    <span
      className={cn(
        "relative inline-flex items-center leading-none",
        sweep && "nx-sweep-text",
        className,
      )}
      style={{ height, width }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TROVE_WORDMARK_DARK}
        alt="Trove"
        width={width}
        height={height}
        className="object-contain object-left dark:hidden"
        style={{ width, height }}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TROVE_WORDMARK_LIGHT}
        alt="Trove"
        width={width}
        height={height}
        className="hidden object-contain object-left dark:block"
        style={{ width, height }}
        draggable={false}
      />
    </span>
  );
}

/** Official icon + wordmark lockup for nav, splash, auth, landing, sidebar. */
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
  /** @deprecated kept for call-site compatibility */
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
