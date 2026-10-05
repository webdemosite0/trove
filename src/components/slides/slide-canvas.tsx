"use client";

import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Slide } from "@/lib/slides";
import {
  DEFAULT_THEME,
  MIN_TEXT_CONTRAST,
  contrastRatio,
  fontFamilyFor,
  patternBackground,
} from "@/lib/slides";
import { Editable } from "@/components/slides/editable";

/**
 * Slide canvas applies each deck's Theme (accent, font, pattern, canvas/ink).
 * Layouts change structure; theme changes look and feel.
 *
 * Contrast guard: if the deck sets a dark canvas without a matching ink,
 * force a dark context so text-ink etc. resolve to light colors (and vice
 * versa). Otherwise a dark AI-generated theme renders dark-on-dark in
 * light mode.
 */
function isDarkColor(hex: string | undefined): boolean | null {
  if (!hex) return null;
  const m = hex.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Relative luminance (sRGB)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.4;
}

type EditHandlers = {
  onTitle: (v: string) => void;
  onBullet: (i: number, v: string) => void;
  onAddBullet: (after: number) => void;
  onRemoveBullet: (i: number) => void;
};

export const SlideCanvas = memo(function SlideCanvas({
  slide,
  index,
  total,
  className,
  thumb = false,
  edit,
}: {
  slide: Slide;
  index: number;
  total: number;
  className?: string;
  thumb?: boolean;
  edit?: EditHandlers;
}) {
  const layout = slide.layout || (slide.bullets.length ? "bullets" : "title");
  const titleOnly = layout === "title" || layout === "section";
  const hasPhoto = Boolean(slide.image) || layout === "photo" || layout === "split";
  const theme = slide.theme || DEFAULT_THEME;
  const accent = theme.accent || DEFAULT_THEME.accent;
  // If the deck picked a canvas but no ink, match the text to the canvas
  // so a dark AI-generated theme doesn't render dark-on-dark in light mode.
  // R4: an explicit ink that fails WCAG AA (4.5:1) against its own canvas —
  // e.g. black ink on a near-black canvas — is treated as absent so the
  // derived pairing below keeps text readable. (parseThemeLine now fixes
  // this at generation time; this is the backstop for older saved decks.)
  const inkRatio =
    theme.canvas && theme.ink ? contrastRatio(theme.ink, theme.canvas) : null;
  const inkUsable =
    !theme.ink || inkRatio == null || inkRatio >= MIN_TEXT_CONTRAST;
  const effectiveInk = inkUsable ? theme.ink : undefined;
  const canvasDark = isDarkColor(theme.canvas);
  const autoInk =
    effectiveInk || (canvasDark === true ? "#ececec" : canvasDark === false ? "#1a1a1e" : undefined);

  return (
    <div
      className={cn(
        "relative isolate aspect-video w-full overflow-hidden rounded-[var(--r-panel)] border border-line",
        className,
      )}
      style={{
        containerType: "inline-size",
        fontFamily: fontFamilyFor(theme.font),
        // Drive accents / ink from the deck theme for this slide.
        ["--color-accent" as string]: accent,
        ["--slide-accent" as string]: accent,
        // When we auto-derived ink from a dark/light canvas, push it into
        // the ink variables too so text-ink/text-ink-2/etc. stay readable.
        ...(autoInk && !effectiveInk
          ? {
              ["--color-ink" as string]: autoInk,
              ["--color-ink-2" as string]: canvasDark === true ? "#d4d4d8" : "#3f3f46",
              ["--color-ink-3" as string]: canvasDark === true ? "#a1a1aa" : "#71717a",
              ["--color-ink-4" as string]: canvasDark === true ? "#71717a" : "#a1a1aa",
            }
          : null),
        color: effectiveInk || autoInk || undefined,
        background: patternBackground(theme.pattern, accent, theme.canvas),
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            layout === "section"
              ? `linear-gradient(135deg, color-mix(in oklab, ${accent} 22%, transparent), transparent 60%)`
              : undefined,
        }}
      />

      {layout === "photo" ? (
        <PhotoFull slide={slide} index={index} total={total} thumb={thumb} edit={edit} />
      ) : layout === "split" || (hasPhoto && layout === "bullets") ? (
        <SplitPhoto slide={slide} index={index} total={total} thumb={thumb} edit={edit} />
      ) : layout === "quote" ? (
        <QuoteLayout slide={slide} index={index} total={total} thumb={thumb} edit={edit} />
      ) : (
        <StandardLayout
          slide={slide}
          index={index}
          total={total}
          thumb={thumb}
          edit={edit}
          titleOnly={titleOnly}
          section={layout === "section"}
        />
      )}
    </div>
  );
});

function PageNum({ index, total, thumb }: { index: number; total: number; thumb?: boolean }) {
  if (thumb) return null;
  return (
    <span className="absolute bottom-[4cqw] right-[6cqw] text-[1.9cqw] tabular-nums text-ink-4">
      {index + 1} / {total}
    </span>
  );
}

function Title({
  slide,
  index,
  edit,
  size,
}: {
  slide: Slide;
  index: number;
  edit?: EditHandlers;
  size: "hero" | "normal" | "section";
}) {
  const sizes = {
    hero: "text-[6.4cqw] leading-[1.12]",
    normal: "text-[4.6cqw] leading-[1.16]",
    section: "text-[5.4cqw] leading-[1.12]",
  };
  return (
    <h2 className={cn("font-semibold tracking-tight text-ink", sizes[size])}>
      {edit ? (
        <Editable
          ariaLabel={`Title of slide ${index + 1}`}
          value={slide.title}
          placeholder={`Slide ${index + 1}`}
          onChange={edit.onTitle}
          onEnter={() => edit.onAddBullet(-1)}
        />
      ) : (
        slide.title || `Slide ${index + 1}`
      )}
    </h2>
  );
}

function Bullets({
  slide,
  index,
  edit,
  thumb,
  max = 6,
}: {
  slide: Slide;
  index: number;
  edit?: EditHandlers;
  thumb?: boolean;
  max?: number;
}) {
  if (!slide.bullets.length) return null;
  const list = thumb ? slide.bullets.slice(0, 4) : slide.bullets.slice(0, max);
  return (
    <ul className={cn("mt-[3.2cqw] space-y-[1.7cqw]", thumb && "overflow-hidden")}>
      {list.map((b, i) => (
        <li key={i} className="flex gap-[2cqw] text-[2.5cqw] leading-[1.45] text-ink-2">
          <span
            aria-hidden
            className="mt-[0.85cqw] h-[0.85cqw] w-[0.85cqw] shrink-0 rounded-full bg-accent"
          />
          {edit ? (
            <Editable
              className="min-w-0 flex-1"
              ariaLabel={`Bullet ${i + 1} on slide ${index + 1}`}
              value={b}
              placeholder="Empty point"
              onChange={(v) => edit.onBullet(i, v)}
              onEnter={() => edit.onAddBullet(i)}
              onEmptyBackspace={() => edit.onRemoveBullet(i)}
            />
          ) : (
            <span className="min-w-0">{b}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PhotoFrame({ image, thumb }: { image?: string; thumb?: boolean }) {
  const isUrl = image && (/^https?:\/\//i.test(image) || image.startsWith("data:image/"));
  // If the remote image fails (rate limits, downtime), fall back to the
  // styled placeholder instead of a broken-image icon.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return (
    <div className={cn("relative overflow-hidden bg-sunk", thumb ? "min-h-[40%]" : "min-h-0")}>
      {isUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[18cqw] flex-col items-center justify-center gap-[1.2cqw] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-pink-500/15 px-[4cqw] text-center">
          <span className="text-[2cqw] font-medium uppercase tracking-[0.12em] text-ink-4">
            Photo
          </span>
          <p className="max-w-[36ch] text-[2.2cqw] leading-snug text-ink-3">
            {image && !/^https?:\/\//i.test(image) ? image : "Visual panel"}
          </p>
        </div>
      )}
    </div>
  );
}

function StandardLayout({
  slide,
  index,
  total,
  thumb,
  edit,
  titleOnly,
  section,
}: {
  slide: Slide;
  index: number;
  total: number;
  thumb?: boolean;
  edit?: EditHandlers;
  titleOnly: boolean;
  section?: boolean;
}) {
  return (
    <>
      <div className="relative flex h-full flex-col justify-center px-[7cqw] py-[6cqw]">
        <span
          aria-hidden
          className="mb-[2.6cqw] block h-[0.7cqw] w-[7cqw] rounded-full bg-accent"
        />
        <Title
          slide={slide}
          index={index}
          edit={edit}
          size={titleOnly ? (section ? "section" : "hero") : "normal"}
        />
        {!titleOnly ? <Bullets slide={slide} index={index} edit={edit} thumb={thumb} /> : null}
        {titleOnly && slide.bullets[0] ? (
          <p className="mt-[2.4cqw] max-w-[36ch] text-[2.6cqw] leading-relaxed text-ink-3">
            {slide.bullets[0]}
          </p>
        ) : null}
      </div>
      <PageNum index={index} total={total} thumb={thumb} />
    </>
  );
}

function SplitPhoto({
  slide,
  index,
  total,
  thumb,
  edit,
}: {
  slide: Slide;
  index: number;
  total: number;
  thumb?: boolean;
  edit?: EditHandlers;
}) {
  return (
    <>
      <div className="relative grid h-full grid-cols-2">
        <div className="flex flex-col justify-center px-[5cqw] py-[5cqw]">
          <span
            aria-hidden
            className="mb-[2cqw] block h-[0.6cqw] w-[5cqw] rounded-full bg-accent"
          />
          <Title slide={slide} index={index} edit={edit} size="normal" />
          <Bullets slide={slide} index={index} edit={edit} thumb={thumb} max={5} />
        </div>
        <PhotoFrame image={slide.image} thumb={thumb} />
      </div>
      <PageNum index={index} total={total} thumb={thumb} />
    </>
  );
}

function PhotoFull({
  slide,
  index,
  total,
  thumb,
  edit,
}: {
  slide: Slide;
  index: number;
  total: number;
  thumb?: boolean;
  edit?: EditHandlers;
}) {
  return (
    <>
      <div className="relative flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <PhotoFrame image={slide.image} thumb={thumb} />
        </div>
        <div className="border-t border-line bg-raised/95 px-[6cqw] py-[3.5cqw] backdrop-blur">
          <Title slide={slide} index={index} edit={edit} size="normal" />
          {slide.bullets[0] ? (
            <p className="mt-[1.2cqw] text-[2.3cqw] leading-snug text-ink-3">{slide.bullets[0]}</p>
          ) : null}
        </div>
      </div>
      <PageNum index={index} total={total} thumb={thumb} />
    </>
  );
}

function QuoteLayout({
  slide,
  index,
  total,
  thumb,
  edit,
}: {
  slide: Slide;
  index: number;
  total: number;
  thumb?: boolean;
  edit?: EditHandlers;
}) {
  const quote = slide.bullets[0] || slide.title;
  const attr = slide.bullets[1] || "";
  return (
    <>
      <div className="relative flex h-full flex-col justify-center px-[8cqw] py-[6cqw]">
        <span className="mb-[2cqw] text-[8cqw] leading-none text-accent/40" aria-hidden>
          “
        </span>
        <p className="font-semibold tracking-tight text-ink text-[4.2cqw] leading-[1.25]">
          {edit ? (
            <Editable
              ariaLabel={`Quote on slide ${index + 1}`}
              value={quote}
              placeholder="Quote"
              onChange={(v) => {
                if (slide.bullets.length) edit.onBullet(0, v);
                else edit.onTitle(v);
              }}
            />
          ) : (
            quote
          )}
        </p>
        {attr ? <p className="mt-[2.4cqw] text-[2.3cqw] text-ink-3">— {attr}</p> : null}
      </div>
      <PageNum index={index} total={total} thumb={thumb} />
    </>
  );
}
