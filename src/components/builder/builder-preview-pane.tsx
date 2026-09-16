"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BrowserFrame,
  type PreviewDestination,
} from "@/components/builder/browser-frame";
import type { ProjectFile } from "@/lib/builder";
import {
  getLocalRuntimeSnapshot,
  subscribeLocalRuntime,
  syncLocalProject,
} from "@/lib/browser-runtime";

/**
 * Full-height project preview backed by the reusable E2B runtime.
 * The provider URL stays out of Trove's chrome; users see a product-style
 * preview workspace while the real Vite server remains embedded underneath.
 */
export function BuilderPreviewPane({
  preview,
  files = [],
  onRefresh,
  onNavigate,
  publishControl,
  pageTitle = "Homepage",
}: {
  preview: string | null;
  files?: ProjectFile[];
  sandboxUrl?: string | null;
  onSandboxError?: () => void;
  onRefresh?: () => void;
  onNavigate?: (destination: PreviewDestination) => void;
  publishControl?: ReactNode;
  pageTitle?: string;
}) {
  const [runtime, setRuntime] = useState(getLocalRuntimeSnapshot());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => subscribeLocalRuntime(setRuntime), []);

  const filesKey = useMemo(
    () => files.map((file) => `${file.path}:${file.content.length}`).join("|"),
    [files],
  );

  useEffect(() => {
    if (!files.length) return;
    void syncLocalProject(files);
  }, [files, filesKey]);

  const useLive = runtime.status === "ready" && Boolean(runtime.url);
  const useSnapshot = Boolean(preview) && !useLive;
  const displayUrl = useLive
    ? `localhost:${runtime.port || 5173}`
    : preview
      ? "localhost:5173"
      : "about:blank";

  const openPreview = () => {
    if (useLive && runtime.url) {
      window.open(runtime.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const chromeStatus =
    runtime.status === "error"
      ? "error"
      : useLive
        ? "ready"
        : runtime.status === "booting" ||
            runtime.status === "installing" ||
            runtime.status === "starting" ||
            runtime.status === "syncing"
          ? "working"
          : "idle";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#1b1b1c]">
      <BrowserFrame
        url={displayUrl}
        pageTitle={pageTitle}
        status={chromeStatus}
        publishControl={publishControl}
        onNavigate={onNavigate}
        onOpen={useLive || preview ? openPreview : undefined}
        onRefresh={() => {
          setRefreshKey((value) => value + 1);
          if (files.length) void syncLocalProject(files);
          onRefresh?.();
        }}
        className="h-full min-h-0"
      >
        {useLive && runtime.url ? (
          <iframe
            key={`${runtime.url}:${refreshKey}`}
            title="Live site preview"
            src={runtime.url}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="accelerometer; camera; geolocation; microphone; clipboard-write; fullscreen"
            referrerPolicy="no-referrer"
          />
        ) : useSnapshot && preview ? (
          <iframe
            key={`${preview.slice(0, 80)}:${refreshKey}`}
            title="Preview snapshot"
            srcDoc={preview}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full min-h-[280px] place-items-center bg-white px-6 text-center text-[#242427]">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl border border-black/[0.08] bg-[#f7f7f8] shadow-sm">
                <span className="font-mono text-[15px] font-semibold text-[#6f45ff]">{"//"}</span>
              </div>
              <p className="text-[16px] font-semibold tracking-tight">Live preview</p>
              <p className="mt-2 text-[13px] leading-5 text-black/45">
                Build your project and Trove will start its Vite server in an isolated cloud sandbox.
              </p>
            </div>
          </div>
        )}
      </BrowserFrame>

      {runtime.status === "error" && runtime.error ? (
        <div className="pointer-events-none absolute bottom-5 left-6 z-50 max-w-[360px] rounded-2xl border border-amber-400/20 bg-[#242426]/95 px-3.5 py-2.5 text-[11.5px] leading-5 text-amber-100 shadow-2xl backdrop-blur-xl">
          Live runtime unavailable: {runtime.error}. Showing the saved snapshot.
        </div>
      ) : null}
    </div>
  );
}
