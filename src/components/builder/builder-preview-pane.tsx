"use client";

import { BrowserFrame } from "@/components/builder/browser-frame";

/**
 * Always prefers bundled HTML (srcDoc) so the site stays visible when the
 * ephemeral E2B host expires or DNS fails.
 */
export function BuilderPreviewPane({
  preview,
  sandboxUrl,
  onSandboxError,
}: {
  preview: string | null;
  sandboxUrl: string | null;
  onSandboxError?: () => void;
}) {
  const url = sandboxUrl
    ? sandboxUrl.replace(/^https?:\/\//, "")
    : preview
      ? "localhost:preview"
      : "about:blank";

  return (
    <BrowserFrame url={url}>
      {preview ? (
        <iframe
          title="Preview"
          srcDoc={preview}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      ) : sandboxUrl ? (
        <iframe
          title="Live Preview"
          src={sandboxUrl}
          className="h-full w-full border-0 bg-white"
          allow="accelerometer; camera; geolocation; microphone; clipboard-write"
          onError={() => onSandboxError?.()}
        />
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <p className="text-[16px] font-semibold text-ink">Preview</p>
            <p className="mt-2 max-w-sm text-[13px] text-ink-4">
              After the first build, your site appears here. If the live host expires, we still show the built HTML.
            </p>
          </div>
        </div>
      )}
    </BrowserFrame>
  );
}
