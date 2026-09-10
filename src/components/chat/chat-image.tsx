"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDownload, FiExternalLink, FiX, FiCopy, FiCheck } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";

/**
 * Generated / markdown image in chat with open + download actions.
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

  const close = useCallback(() => setOpen(false), []);

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

  const download = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (alt || "image").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 48) + ".png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // data URLs / CORS: open in new tab as fallback
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(src.startsWith("data:") ? "[embedded image]" : src);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <figure className="group relative overflow-hidden rounded-[var(--r-panel)] border border-line bg-sunk shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Image"}
          className="max-h-[420px] w-full cursor-zoom-in object-contain bg-canvas transition-opacity hover:opacity-95"
          loading="lazy"
          onClick={() => setOpen(true)}
        />
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-[var(--r-chip)] border border-line bg-raised/95 text-ink-2 shadow-sm backdrop-blur hover:text-ink"
            title="Open"
            aria-label="Open image"
          >
            <Ico icon={FiExternalLink} motion="launch" size={14} />
          </button>
          <button
            type="button"
            onClick={download}
            className="grid h-8 w-8 place-items-center rounded-[var(--r-chip)] border border-line bg-raised/95 text-ink-2 shadow-sm backdrop-blur hover:text-ink"
            title="Download"
            aria-label="Download image"
          >
            <Ico icon={FiDownload} motion="nudge" size={14} />
          </button>
        </div>
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={close}
        >
          <div
            className="relative max-h-[92vh] max-w-[min(96vw,1100px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "Image"}
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={download}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                <Ico icon={FiDownload} motion="nudge" size={14} />
                Download
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                <Ico icon={copied ? FiCheck : FiCopy} motion={copied ? "check" : "nudge"} size={14} />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                <Ico icon={FiX} motion="pop" size={14} />
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
