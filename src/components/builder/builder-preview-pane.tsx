"use client";

import { useState } from "react";
import { BrowserFrame } from "@/components/builder/browser-frame";

/**
 * Full-height builder preview.
 * Prefer the live E2B sandbox URL when available (it works in a new tab).
 * Fall back to bundled HTML (srcDoc) when the sandbox is missing or fails.
 */
export function BuilderPreviewPane({
  preview,
  sandboxUrl,
  onSandboxError,
  onRefresh,
}: {
  preview: string | null;
  sandboxUrl: string | null;
  onSandboxError?: () => void;
  onRefresh?: () => void;
}) {
  const [sandboxFailed, setSandboxFailed] = useState(false);
  const [mode, setMode] = useState<"live" | "snapshot">("live");

  const useLive = Boolean(sandboxUrl) && !sandboxFailed && mode === "live";
  const useSnapshot = Boolean(preview) && (!useLive || mode === "snapshot");

  const displayUrl = useLive
    ? sandboxUrl!.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : useSnapshot
      ? "localhost:preview"
      : "about:blank";

  const openExternal = () => {
    if (sandboxUrl) {
      window.open(sandboxUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/html;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    window.open(u, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(u), 60_000);
  };

  const handleSandboxError = () => {
    setSandboxFailed(true);
    setMode("snapshot");
    onSandboxError?.();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-1.5 p-1.5 md:p-2">
      {sandboxUrl && preview ? (
        <div className="flex shrink-0 items-center gap-1 px-0.5">
          <button
            type="button"
            onClick={() => {
              setSandboxFailed(false);
              setMode("live");
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              useLive
                ? "bg-accent/15 text-accent"
                : "text-ink-4 hover:bg-hover hover:text-ink"
            }`}
          >
            Live sandbox
          </button>
          <button
            type="button"
            onClick={() => setMode("snapshot")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              !useLive && useSnapshot
                ? "bg-accent/15 text-accent"
                : "text-ink-4 hover:bg-hover hover:text-ink"
            }`}
          >
            Snapshot
          </button>
        </div>
      ) : null}

      <BrowserFrame
        url={displayUrl}
        onOpen={preview || sandboxUrl ? openExternal : undefined}
        onRefresh={() => {
          if (useLive) {
            setSandboxFailed(false);
            // Force iframe reload by toggling failed flag briefly via key below
            setMode("live");
          }
          onRefresh?.();
        }}
        className="h-full min-h-0 shadow-md"
      >
        {useLive ? (
          <iframe
            key={sandboxUrl}
            title="Live Preview"
            src={sandboxUrl!}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="accelerometer; camera; geolocation; microphone; clipboard-write; fullscreen"
            referrerPolicy="no-referrer"
            // E2B Vite needs scripts + same-origin for HMR sockets when allowed
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-presentation"
            onError={handleSandboxError}
          />
        ) : useSnapshot ? (
          <iframe
            key={preview!.slice(0, 80)}
            title="Preview"
            srcDoc={preview!}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full min-h-[280px] place-items-center px-6 text-center">
            <div>
              <p className="text-[16px] font-semibold text-ink">Preview</p>
              <p className="mt-2 max-w-sm text-[13px] text-ink-4">
                After the first build, your site appears here. If the live sandbox opens in a new tab but not here, use the Open button above — some hosts block embedding.
              </p>
              {sandboxUrl ? (
                <button
                  type="button"
                  onClick={openExternal}
                  className="mt-4 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white"
                >
                  Open live preview
                </button>
              ) : null}
            </div>
          </div>
        )}
      </BrowserFrame>
    </div>
  );
}
