"use client";

import * as React from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiImage } from "react-icons/fi";
import { parseBrandSheet, type BrandSheet } from "@/lib/artifact-block";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Fullscreen image lightbox                                           */
/* ------------------------------------------------------------------ */

export function ImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: { src: string; title: string }[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const total = images.length;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stopPropagation: a brand sheet can sit inside the
        // artifact viewer modal, which also closes on Escape. First Escape
        // should only close the lightbox.
        e.stopPropagation();
        onClose();
      }
      if (e.key === "ArrowRight") onIndex((index + 1) % total);
      if (e.key === "ArrowLeft") onIndex((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [index, total, onClose, onIndex]);

  const img = images[index];
  if (!img) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={img.title}
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="truncate text-[13px] font-medium text-white/90">
          {img.title}
          {total > 1 ? (
            <span className="ml-2 text-white/50">
              {index + 1} / {total}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="grid size-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <FiX size={18} />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onIndex((index - 1 + total) % total)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % total)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <FiChevronRight size={20} />
            </button>
          </>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={img.title}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand sheet                                                         */
/* ------------------------------------------------------------------ */

function HexCopy({ hex }: { hex: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      title="Copy hex"
      onClick={(e) => {
        e.stopPropagation();
        const done = () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(hex).then(done).catch(done);
        } else {
          done();
        }
      }}
      className="rounded-md px-1.5 py-0.5 font-mono text-[11px] text-ink-3 transition hover:bg-hover hover:text-ink"
    >
      {copied ? "Copied!" : hex.toUpperCase()}
    </button>
  );
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-canvas/50 p-4 text-center">
      <FiImage size={22} className="text-ink-4" />
      <p className="text-[11.5px] text-ink-4">{label}</p>
    </div>
  );
}

export function BrandSheetView({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  const sheet: BrandSheet | null = React.useMemo(() => parseBrandSheet(content), [content]);
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  const images = React.useMemo(() => {
    if (!sheet) return [];
    const out: { src: string; title: string }[] = [];
    if (sheet.logoUrl) out.push({ src: sheet.logoUrl, title: `${sheet.name} — logo` });
    for (const ex of sheet.examples) {
      if (ex.imageUrl) out.push({ src: ex.imageUrl, title: ex.title });
    }
    return out;
  }, [sheet]);

  if (!sheet) {
    return (
      <p className="p-4 text-[12.5px] text-ink-4">
        This brand sheet couldn&apos;t be parsed.
      </p>
    );
  }

  const openAt = (src: string) => {
    const i = images.findIndex((im) => im.src === src);
    if (i >= 0) setLightbox(i);
  };

  return (
    <div className={cn("w-full", compact ? "p-3" : "p-5")}>
      {/* Logo hero */}
      <div className="overflow-hidden rounded-2xl border border-line bg-canvas/60">
        {sheet.logoUrl ? (
          <button
            type="button"
            onClick={() => openAt(sheet.logoUrl!)}
            aria-label="Open logo fullscreen"
            className="group block w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sheet.logoUrl}
              alt={`${sheet.name} logo`}
              className={cn(
                "w-full object-cover transition group-hover:opacity-95",
                compact ? "aspect-[2/1]" : "aspect-[21/9]",
              )}
            />
          </button>
        ) : (
          <ImagePlaceholder label="Logo is generating — reopen in a moment" />
        )}
        <div className={cn("border-t border-line", compact ? "px-3 py-2.5" : "px-5 py-4")}>
          <h3 className={cn("font-bold tracking-tight text-ink", compact ? "text-[17px]" : "text-[22px]")}>
            {sheet.name}
          </h3>
          {sheet.tagline ? (
            <p className={cn("mt-0.5 text-ink-3", compact ? "text-[12px]" : "text-[13.5px]")}>{sheet.tagline}</p>
          ) : null}
        </div>
      </div>

      {/* Palette */}
      {sheet.palette.length > 0 ? (
        <section className={compact ? "mt-3" : "mt-5"}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Colors
          </h4>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sheet.palette.map((c) => (
              <div key={c.hex + c.name} className="overflow-hidden rounded-xl border border-line">
                <div className="h-12 w-full" style={{ backgroundColor: c.hex }} />
                <div className="bg-raised/60 px-1.5 py-1">
                  <p className="truncate text-[10.5px] font-medium text-ink-2">{c.name}</p>
                  <HexCopy hex={c.hex} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Typography */}
      <section className={compact ? "mt-3" : "mt-5"}>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
          Typography
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-raised/60 p-3">
            <p className="font-serif text-[26px] leading-none text-ink">Ag</p>
            <p className="mt-1.5 truncate text-[12px] font-semibold text-ink-2">{sheet.fonts.heading}</p>
            <p className="text-[10.5px] text-ink-4">Headings</p>
          </div>
          <div className="rounded-xl border border-line bg-raised/60 p-3">
            <p className="font-sans text-[26px] leading-none text-ink">Ag</p>
            <p className="mt-1.5 truncate text-[12px] font-semibold text-ink-2">{sheet.fonts.body}</p>
            <p className="text-[10.5px] text-ink-4">Body</p>
          </div>
        </div>
      </section>

      {/* Examples */}
      {sheet.examples.length > 0 ? (
        <section className={compact ? "mt-3" : "mt-5"}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            In use
          </h4>
          <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
            {sheet.examples.map((ex, i) => (
              <figure key={`${ex.title}-${i}`} className="overflow-hidden rounded-xl border border-line">
                {ex.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => openAt(ex.imageUrl!)}
                    aria-label={`Open ${ex.title} fullscreen`}
                    className="group block w-full cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ex.imageUrl}
                      alt={ex.title}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition group-hover:opacity-95"
                    />
                  </button>
                ) : (
                  <ImagePlaceholder label="Generating…" />
                )}
                <figcaption className="bg-raised/60 px-2 py-1.5">
                  <p className="truncate text-[11.5px] font-semibold text-ink-2">{ex.title}</p>
                  {ex.caption && !compact ? (
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-ink-4">{ex.caption}</p>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Guidelines */}
      {sheet.guidelines && !compact ? (
        <section className="mt-5">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Guidelines
          </h4>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{sheet.guidelines}</p>
        </section>
      ) : null}

      {lightbox !== null && images[lightbox] ? (
        <ImageLightbox
          images={images}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
