"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDownload, FiExternalLink, FiX, FiCopy, FiCheck, FiImage } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/** Premium skeleton while an image is being generated. */
export function ImageGeneratingCard({ caption }: { caption?: string }) {
  return (
    <div
      className="nx-in my-2 max-w-[min(100%,420px)] overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_12px_40px_-24px_rgba(0,0,0,0.5)]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sunk">
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-500/10 via-sky-500/10 to-fuchsia-500/10"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 48%, transparent 62%)",
            backgroundSize: "200% 100%",
            animation: "nx-btn-sheen 2.4s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-canvas/80 text-ink shadow-sm backdrop-blur-sm">
            <Ico icon={FiImage} motion="sparkle" size={22} live className="text-accent" />
          </span>
          <div className="text-center">
            <p className="text-[13.5px] font-semibold text-ink">Creating image</p>
            <p className="mt-0.5 max-w-[240px] truncate px-3 text-[12px] text-ink-3">
              {caption?.trim() || "Composing lighting, style, and detail…"}
            </p>
          </div>
          <span className="inline-flex gap-1" aria-hidden>
            <span className="nx-thinking-dot size-1.5 rounded-full bg-ink-3" />
            <span className="nx-thinking-dot size-1.5 rounded-full bg-ink-3 [animation-delay:140ms]" />
            <span className="nx-thinking-dot size-1.5 rounded-full bg-ink-3 [animation-delay:280ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Generated / markdown image in chat — premium reveal, stable lightbox.
 */
export function ChatImage({
  src,
  alt,
}: {
  src: string;
  alt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const asBlob = async (): Promise<Blob | null> => {
    try {
      if (src.startsWith("data:")) {
        const [header, data] = src.split(",");
        const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
        const bin = atob(data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      }
      const res = await fetch(src);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const download = async () => {
    const blob = await asBlob();
    if (!blob) {
      window.open(src, "_blank", "noopener,noreferrer");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (alt || "image").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 48) + ".png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyImage = async () => {
    try {
      const blob = await asBlob();
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const type = blob.type || "image/png";
        await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
      } else if (!src.startsWith("data:")) {
        await navigator.clipboard.writeText(src);
      } else {
        await navigator.clipboard.writeText("[image]");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(src.startsWith("data:") ? "[image]" : src);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <figure
        className="group relative my-2 max-w-[min(100%,420px)] select-none overflow-hidden rounded-2xl border border-line bg-sunk shadow-[0_12px_40px_-22px_rgba(0,0,0,0.5)]"
        onCopy={(e) => {
          e.preventDefault();
          void copyImage();
        }}
      >
        {!loaded && !failed ? (
          <div className="relative aspect-[4/3] w-full min-h-[180px]" aria-hidden>
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sunk via-raised to-sunk" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-canvas/70 text-ink-3 backdrop-blur-sm">
                <Ico icon={FiImage} motion="sparkle" size={18} live />
              </span>
            </div>
          </div>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Image"}
          draggable={false}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          onClick={() => loaded && !failed && setOpen(true)}
          className={cn(
            "w-full cursor-zoom-in bg-canvas object-contain transition duration-500 ease-out",
            loaded && !failed
              ? "max-h-[360px] scale-100 opacity-100"
              : "absolute inset-0 max-h-[360px] scale-[1.03] opacity-0",
          )}
        />
        {failed ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-[13px] text-ink-4">
            <Ico icon={FiImage} motion="alert" size={20} />
            Image unavailable
          </div>
        ) : null}
        {loaded && !failed ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 pb-2.5 pt-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <div className="pointer-events-auto flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
                title="Open"
              >
                <Ico icon={FiExternalLink} motion="launch" size={14} className="text-white" />
              </button>
              <button
                type="button"
                onClick={() => void copyImage()}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
                title="Copy"
              >
                <Ico
                  icon={copied ? FiCheck : FiCopy}
                  motion={copied ? "check" : "copy"}
                  size={14}
                  className="text-white"
                />
              </button>
              <button
                type="button"
                onClick={() => void download()}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
                title="Download"
              >
                <Ico icon={FiDownload} motion="down" size={14} className="text-white" />
              </button>
            </div>
          </div>
        ) : null}
        {alt ? (
          <figcaption className="truncate border-t border-line bg-raised/80 px-3 py-1.5 text-[11.5px] text-ink-3">
            {alt}
          </figcaption>
        ) : null}
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image"}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <Ico icon={FiX} motion="close" size={18} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || "Image"}
            className="max-h-[min(90dvh,920px)] max-w-[min(96vw,1100px)] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
