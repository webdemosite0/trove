"use client";

/**
 * Mobile in-app camera (worker B — Trove mobile workstream).
 *
 * Contract consumed by worker A's composer:
 *   - `isCameraSupported(): boolean` — pure sync capability check. When false,
 *     the menu never offers the camera item.
 *   - `MobileCamera({ onCapture, onClose })` — full-screen camera UI. Calls
 *     `onCapture(file)` with a JPEG File; the parent attaches + closes.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function isCameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    !!window.isSecureContext
  );
}

type Phase = "starting" | "live" | "preview" | "unavailable";

interface PreviewShot {
  file: File;
  url: string;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  NotAllowedError: "Camera access was denied. You can pick a photo instead.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is busy in another app. Close it and try again.",
  OverconstrainedError: "This camera doesn't support the requested mode.",
  SecurityError: "Camera access is blocked in this context.",
  AbortError: "Camera start was interrupted. Try again.",
};

function friendlyMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  return FRIENDLY_ERRORS[name] ?? "Couldn't start the camera. You can pick a photo instead.";
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* already stopped */
    }
  });
}

export function MobileCamera({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [preview, setPreview] = useState<PreviewShot | null>(null);
  const [lastShot, setLastShot] = useState<PreviewShot | null>(null);
  // Monotonic id so a retry loop can never resume a stale async start.
  const sessionRef = useRef(0);

  const acquire = useCallback(
    async (mode: "environment" | "user", session: number) => {
      stopStream(streamRef.current);
      streamRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
        if (sessionRef.current !== session) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            /* play() can reject before metadata; the element retries on loadedmetadata */
          }
        }
        const track = stream.getVideoTracks()[0];
        // `torch` is a real Media Capture capability but absent from TS's
        // DOM lib — narrow it locally rather than widening global types.
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
        };
        setTorchSupported(caps.torch === true);
        if (sessionRef.current === session) setPhase("live");
      } catch (err) {
        if (sessionRef.current !== session) return;
        setError(friendlyMessage(err));
        setPhase("unavailable");
      }
    },
    []
  );

  // (Re)acquire when facing mode changes; start once on mount.
  useEffect(() => {
    const session = ++sessionRef.current;
    void acquire(facing, session);
    return () => {
      // Invalidate any in-flight start, then stop the stream.
      sessionRef.current++;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facing, acquire]);

  // Revoke object URLs when replaced/unmounted — never leak blob memory.
  useEffect(() => {
    const shot = lastShot;
    return () => {
      if (shot && (!preview || preview.url !== shot.url)) URL.revokeObjectURL(shot.url);
    };
  }, [lastShot, preview]);

  const handleClose = useCallback(() => {
    sessionRef.current++;
    stopStream(streamRef.current);
    streamRef.current = null;
    onClose();
  }, [onClose]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilePicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      e.target.value = ""; // allow re-picking the same file / re-cancel
      if (file) {
        onCapture(file);
      } else {
        // User cancelled the picker: stay on camera UI with a small hint.
        setHint("No photo selected — try again or use the camera.");
      }
    },
    [onCapture]
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || phase !== "live") return;
    // iOS: videoWidth/Height are 0 until loadedmetadata has fired.
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setHint("Camera is still warming up — one moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setHint("Couldn't grab the frame — try again.");
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setHint("Couldn't save the photo — try again.");
          return;
        }
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const shot: PreviewShot = { file, url };
        setLastShot((prev) => {
          if (prev && prev.url !== url) URL.revokeObjectURL(prev.url);
          return shot;
        });
        setPreview(shot);
        setPhase("preview");
        // White flash + small bounce on the shutter.
        setFlash(true);
        setBounceKey((k) => k + 1);
        window.setTimeout(() => setFlash(false), 180);
      },
      "image/jpeg",
      0.92
    );
  }, [phase]);

  const retake = useCallback(() => {
    setPreview((prev) => {
      // Keep lastShot's thumbnail alive; preview URL == lastShot URL here,
      // so revoke nothing — the thumbnail still references it.
      return prev;
    });
    setPreview(null);
    setPhase("live");
  }, []);

  const usePhoto = useCallback(() => {
    if (!preview) return;
    onCapture(preview.file);
    // Parent (worker A) attaches + closes; we don't unmount ourselves.
  }, [preview, onCapture]);

  const flip = useCallback(() => {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
    setPhase("starting");
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setHint("Flash isn't adjustable on this camera.");
    }
  }, [torchOn]);

  const viewfinderMirrored = facing === "user";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      className="fixed inset-0 z-[400] flex flex-col bg-black text-white"
    >
      {/* Glassy header — theme tokens only, via glass.css vars */}
      <div
        className="relative z-10 flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]"
        style={{
          background: "var(--glass-tint-bar)",
          backdropFilter: "blur(var(--glass-blur-soft)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-soft)) saturate(var(--glass-saturate))",
          borderBottom: "1px solid var(--glass-rim)",
          boxShadow: "inset 0 1px 0 var(--glass-glare)",
        }}
      >
        <button
          type="button"
          aria-label="Close camera"
          onClick={handleClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-[17px] font-semibold tracking-wide">Camera</h2>
        <div className="flex w-11 items-center justify-center">
          {torchSupported && phase === "live" && (
            <button
              type="button"
              aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torchOn}
              onClick={toggleTorch}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ color: torchOn ? "var(--color-violet)" : "currentColor" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={torchOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder / preview area */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {phase === "preview" && preview ? (
          <img
            src={preview.url}
            alt="Captured photo preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            disablePictureInPicture
            className="absolute inset-0 h-full w-full object-cover"
            style={viewfinderMirrored ? { transform: "scaleX(-1)" } : undefined}
            aria-label="Camera viewfinder"
          />
        )}

        {/* White flash overlay on capture */}
        {flash && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-white"
            style={{ animation: "cam-flash 180ms ease-out forwards" }}
          />
        )}

        {/* Starting state */}
        {phase === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white"
              role="status"
              aria-label="Starting camera"
            />
            <p className="text-sm text-white/70">Starting camera…</p>
          </div>
        )}

        {/* Denied / error state with file-picker fallback */}
        {phase === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--color-violet) 18%, transparent)" }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <line x1="4" y1="4" x2="20" y2="20" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-white">{error ?? "Camera unavailable."}</p>
            <button
              type="button"
              onClick={openFilePicker}
              className="h-12 rounded-full px-6 text-[15px] font-semibold text-white transition-transform active:scale-95"
              style={{ background: "var(--color-violet)" }}
            >
              Choose a photo instead
            </button>
          </div>
        )}

        {/* Transient hint (e.g. picker cancelled, torch not adjustable) */}
        {hint && phase !== "unavailable" && (
          <div className="absolute inset-x-0 top-3 flex justify-center px-6">
            <button
              type="button"
              onClick={() => setHint(null)}
              className="rounded-full bg-black/70 px-4 py-2 text-[13px] text-white backdrop-blur"
            >
              {hint}
            </button>
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div
        className="relative z-10 px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4"
        style={{
          background: "var(--glass-tint-bar)",
          backdropFilter: "blur(var(--glass-blur-soft)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-soft)) saturate(var(--glass-saturate))",
          borderTop: "1px solid var(--glass-rim)",
        }}
      >
        {phase === "preview" && preview ? (
          /* Preview actions */
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={retake}
              className="flex h-12 min-w-[7rem] items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-[15px] font-semibold text-white transition-transform active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
              Retake
            </button>
            <button
              type="button"
              onClick={usePhoto}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-transform active:scale-95"
              style={{ background: "var(--color-violet)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Use photo
            </button>
          </div>
        ) : (
          /* Live controls: flip | shutter | thumbnail */
          <div className="flex items-center justify-between">
            <div className="flex w-16 justify-start">
              <button
                type="button"
                aria-label="Flip camera"
                onClick={flip}
                disabled={phase !== "live"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all active:scale-90 disabled:opacity-40"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="3.5" />
                  <path d="M17 2l4 4-4 4" />
                </svg>
              </button>
            </div>

            <button
              key={bounceKey}
              type="button"
              aria-label="Take photo"
              onClick={capture}
              disabled={phase !== "live"}
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/90 bg-white/10 transition-transform active:scale-90 disabled:opacity-40"
              style={bounceKey > 0 ? { animation: "cam-bounce 320ms ease-out" } : undefined}
            >
              <span className="h-14 w-14 rounded-full bg-white" aria-hidden="true" />
            </button>

            <div className="flex w-16 justify-end">
              {lastShot ? (
                <button
                  type="button"
                  aria-label="View last photo"
                  onClick={() => {
                    setPreview(lastShot);
                    setPhase("preview");
                  }}
                  className="h-12 w-12 overflow-hidden rounded-xl border border-white/30 transition-transform active:scale-90"
                >
                  <img src={lastShot.url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <div className="h-12 w-12 rounded-xl border border-white/20 bg-white/5" aria-hidden="true" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file-picker fallback for permission denial */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFilePicked}
      />

      {/* Scoped keyframes: flash fade + shutter bounce */}
      <style>{`
        @keyframes cam-flash { from { opacity: 0.9; } to { opacity: 0; } }
        @keyframes cam-bounce {
          0% { transform: scale(1); }
          35% { transform: scale(0.86); }
          70% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cam-bounce { 0%, 100% { transform: scale(1); } }
        }
      `}</style>
    </div>
  );
}
