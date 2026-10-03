"use client";

import { cn } from "@/lib/utils";
import { BRAND_LOGOS, BRAND_MULTICOLOR, BRAND_PNGS } from "@/lib/brand-logos";

function GenericMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M8 3v4H6a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h1v4h2v-4h1a4 4 0 0 0 4-4V9a2 2 0 0 0-2-2h-2V3H8Zm2 4h2v2h2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9h2V7Z"
        opacity=".7"
      />
    </svg>
  );
}

/**
 * Real brand logo for a connector.
 * - Official simple-icons SVG artwork + brand color for most services.
 * - Vendored official SVGs for brands simple-icons dropped.
 * - Real favicon PNGs for the few remaining obscure services.
 * - Generic puzzle mark only when no brand artwork exists.
 */
export function ServiceMark({
  id,
  name,
  size = 28,
  className,
}: {
  id: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const key = id.toLowerCase().replace(/^@/, "").trim();
  const logo = BRAND_LOGOS[key];
  const multi = BRAND_MULTICOLOR[key];
  const pngUri = BRAND_PNGS[key];
  const hasBrand = Boolean(logo) || Boolean(multi) || Boolean(pngUri);
  const iconSize = Math.round(size * 0.72);

  return (
    <span
      aria-hidden
      title={name ?? id}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.06]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {multi ? (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox={multi.viewBox}
          aria-hidden
          role="img"
          // Vendored official brand artwork (never user input).
          dangerouslySetInnerHTML={{ __html: multi.body }}
        />
      ) : logo ? (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={logo.color}
          aria-hidden
          role="img"
        >
          {logo.title ? <title>{logo.title}</title> : null}
          <path d={logo.path} />
        </svg>
      ) : pngUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pngUri}
          alt=""
          width={iconSize}
          height={iconSize}
          style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
        />
      ) : (
        <span style={{ color: "var(--color-ink-3, #71717a)" }}>
          <GenericMark size={iconSize} />
        </span>
      )}
    </span>
  );
}
