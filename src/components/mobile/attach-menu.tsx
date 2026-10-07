"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FiCamera, FiImage, FiPaperclip } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { MobileCamera, isCameraSupported } from "./camera";

const MENU_W = 232;

type ItemId = "camera" | "photo" | "files";

/**
 * The + action menu for the phone composer.
 *
 * Springs open FROM the + button: on mount the button's rect is measured
 * and the popover's transform-origin (`--spring-ox` / `--spring-oy`) is
 * pinned to the button's center, so the menu visibly "comes from in there"
 * with an iOS-style overshoot. Dismisses on backdrop tap, Escape, or after
 * an item is chosen. Camera captures flow through the same `onPickFiles`
 * path as picked files, so the composer's limit checks always apply.
 */
export function AttachMenu({
  anchorRef,
  onPickFiles,
  onClose,
}: {
  /** Ref of the + button the popover springs from. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Runs the composer's limit checks + readAttachment conversion. */
  onPickFiles: (files: File[]) => void;
  onClose: () => void;
}) {
  const popRef = React.useRef<HTMLDivElement>(null);
  const photoRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ left: number; bottom: number } | null>(
    null,
  );
  const [origin, setOrigin] = React.useState<{ x: number; y: number } | null>(
    null,
  );

  // Never a dead button: the Camera row only renders when capture can work.
  const cameraSupported = React.useMemo(() => {
    try {
      return isCameraSupported();
    } catch {
      return false;
    }
  }, []);

  // 1) Anchor the popover just above the + button, clamped to the viewport.
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      left: Math.min(Math.max(r.left - 10, 10), Math.max(10, vw - MENU_W - 10)),
      bottom: Math.max(vh - r.top + 10, 10),
    });
  }, [anchorRef]);

  // 2) Pin the spring's transform-origin to the button's center, measured
  //    against the laid-out popover box. Runs before paint: no flicker, and
  //    the spring animation starts from the button on the first frame.
  React.useLayoutEffect(() => {
    if (!pos) return;
    const anchor = anchorRef.current;
    const pop = popRef.current;
    if (!anchor || !pop) return;
    const r = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    setOrigin({
      x: r.left + r.width / 2 - pr.left,
      y: r.top + r.height / 2 - pr.top,
    });
  }, [pos, anchorRef]);

  // Escape dismisses the menu; while the camera is open it owns Escape.
  React.useEffect(() => {
    if (cameraOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cameraOpen, onClose]);

  /** FileList wrapper: the hidden pickers funnel through the same path. */
  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    onPickFiles(Array.from(list));
    onClose();
  };

  const select = (id: ItemId) => {
    if (id === "camera") {
      setCameraOpen(true);
      return;
    }
    (id === "photo" ? photoRef : fileRef).current?.click();
  };

  const items: { id: ItemId; label: string; hint: string; icon: typeof FiCamera }[] = [
    ...(cameraSupported
      ? [
          {
            id: "camera" as const,
            label: "Camera",
            hint: "Take a photo",
            icon: FiCamera,
          },
        ]
      : []),
    {
      id: "photo" as const,
      label: "Photo library",
      hint: "Choose from your photos",
      icon: FiImage,
    },
    {
      id: "files" as const,
      label: "Files",
      hint: "Documents and more",
      icon: FiPaperclip,
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[140]">
      {/* Backdrop: tap anywhere outside to dismiss. */}
      <button
        type="button"
        aria-label="Close attach menu"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent"
      />

      {pos ? (
        <div
          ref={popRef}
          role="menu"
          aria-label="Attach"
          style={
            {
              left: pos.left,
              bottom: pos.bottom,
              ...(origin
                ? {
                    "--spring-ox": `${origin.x}px`,
                    "--spring-oy": `${origin.y}px`,
                  }
                : {}),
            } as React.CSSProperties
          }
          className="spring-popover absolute w-[232px] rounded-[20px] border border-line-strong bg-raised/92 p-1.5 shadow-[var(--sh-2)] backdrop-blur-xl"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => select(item.id)}
              className="spring-press flex min-h-[56px] w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left active:bg-hover"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-violet-500/10 text-violet-300">
                <Ico icon={item.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium leading-tight text-ink">
                  {item.label}
                </span>
                <span className="block truncate text-[12.5px] text-ink-4">
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Hidden pickers: photo library (no capture attr) and all files. */}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={fromInput}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={fromInput}
      />

      {cameraOpen ? (
        <MobileCamera
          onCapture={(file) => {
            // Same path as picked files: limit checks + readAttachment.
            onPickFiles([file]);
            setCameraOpen(false);
            onClose();
          }}
          onClose={() => setCameraOpen(false)}
        />
      ) : null}
    </div>,
    document.body,
  );
}
