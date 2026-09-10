"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDownload, FiExternalLink, FiX, FiCopy, FiCheck } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";

/**
 * Generated / markdown image in chat — gallery style, copy as image not text.
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

  /** Prefer image/png on clipboard so paste is not broken markdown text. */
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
        className="group relative my-2 max-w-[min(100%,420px)] select-none overflow-hidden rounded-2xl border border-line bg-sunk shadow-[0_8px_30px_-18px_rgba(0,0,0,0.55)]"
        onCopy={(e) => {
          // Stop browser from copying alt/markdown as uneven text.
          e.preventDefault();
          void copyImage();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Image"}
          draggable={false}
          className="max-h-[380px] w-full cursor-zoom-in object-contain bg-canvas transition-opacity hover:opacity-95"
          loading="lazy"
          onClick={() => setOpen(true)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2.5 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="pointer-events-auto flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
              title="Open"
              aria-label="Open image"
            >
              <Ico icon={FiExternalLink} motion="launch" size={14} />
            </button>
            <button
              type="button"
              onClick={() => void copyImage()}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
              title="Copy image"
              aria-label="Copy image"
            >
              <Ico icon={copied ? FiCheck : FiCopy} motion={copied ? "check" : "nudge"} size={14} />
            </button>
            <button
              type="button"
              onClick={() => void download()}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
              title="Download"
              aria-label="Download image"
            >
              <Ico icon={FiDownload} motion="nudge" size={14} />
            </button>
          </div>
        </div>
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
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
              draggable={false}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void download()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                <Ico icon={FiDownload} motion="nudge" size={14} />
                Download
              </button>
              <button
                type="button"
                onClick={() => void copyImage()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                <Ico icon={copied ? FiCheck : FiCopy} motion={copied ? "check" : "nudge"} size={14} />
                {copied ? "Copied image" : "Copy image"}
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
