"use client";

import { BrowserFrame } from "@/components/builder/browser-frame";

/**
 * Full-height builder preview.
 * Prefers bundled HTML (srcDoc) so the site stays visible when the E2B host dies.
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
  const displayUrl = sandboxUrl
    ? sandboxUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : preview
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col p-2 md:p-3">
      <BrowserFrame
        url={displayUrl}
        onOpen={preview || sandboxUrl ? openExternal : undefined}
        onRefresh={onRefresh}
        className="h-full min-h-0 shadow-md"
      >
        {preview ? (
          <iframe
            key={preview.slice(0, 64)}
            title="Preview"
            srcDoc={preview}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : sandboxUrl ? (
          <iframe
            title="Live Preview"
            src={sandboxUrl}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="accelerometer; camera; geolocation; microphone; clipboard-write"
            onError={() => onSandboxError?.()}
          />
        ) : (
          <div className="grid h-full min-h-[280px] place-items-center px-6 text-center">
            <div>
              <p className="text-[16px] font-semibold text-ink">Preview</p>
              <p className="mt-2 max-w-sm text-[13px] text-ink-4">
                After the first build, your site appears here. Ask for changes anytime — the preview updates live.
              </p>
            </div>
          </div>
        )}
      </BrowserFrame>
    </div>
  );
}
