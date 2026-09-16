"use client";

import { useEffect, useMemo, useState } from "react";
import { BrowserFrame } from "@/components/builder/browser-frame";
import type { ProjectFile } from "@/lib/builder";
import {
  getLocalRuntimeSnapshot,
  subscribeLocalRuntime,
  syncLocalProject,
} from "@/lib/browser-runtime";

/**
 * Full-height project preview.
 *
 * The generated Vite app runs in a reusable E2B sandbox. Trove keeps the
 * provider URL out of the workspace chrome and presents the dev server as
 * localhost:5173 while retaining the bundled HTML as an instant fallback.
 */
export function BuilderPreviewPane({
  preview,
  files = [],
  onRefresh,
}: {
  preview: string | null;
  files?: ProjectFile[];
  sandboxUrl?: string | null;
  onSandboxError?: () => void;
  onRefresh?: () => void;
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

  const statusLabel =
    runtime.status === "booting"
      ? "Starting sandbox"
      : runtime.status === "installing"
        ? "Installing packages"
        : runtime.status === "starting"
          ? "Starting preview server"
          : runtime.status === "syncing"
            ? "Syncing files"
            : runtime.status === "error"
              ? "Snapshot fallback"
              : useLive
                ? "Live · sandbox"
                : "Live preview";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2 bg-sunk p-1.5 md:p-2">
      <div className="flex shrink-0 items-center gap-2 px-1">
        <span
          className={`size-1.5 rounded-full ${
            useLive
              ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.12)]"
              : runtime.status === "error"
                ? "bg-amber-400"
                : "animate-pulse bg-accent"
          }`}
        />
        <span className="text-[11px] font-medium text-ink-3">{statusLabel}</span>
        <span className="flex-1" />
        <span className="hidden rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] text-ink-4 sm:inline-flex">
          localhost:{runtime.port || 5173}
        </span>
      </div>

      <BrowserFrame
        url={displayUrl}
        onOpen={useLive || preview ? openPreview : undefined}
        onRefresh={() => {
          setRefreshKey((value) => value + 1);
          if (files.length) void syncLocalProject(files);
          onRefresh?.();
        }}
        className="h-full min-h-0 shadow-[0_16px_50px_rgba(15,23,42,.08)]"
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
          <div className="grid h-full min-h-[280px] place-items-center px-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl border border-line bg-raised shadow-sm">
                <span className="font-mono text-[15px] font-semibold text-accent">{"//"}</span>
              </div>
              <p className="text-[16px] font-semibold tracking-tight text-ink">Live preview</p>
              <p className="mt-2 text-[13px] leading-5 text-ink-4">
                Build your project and Trove will start its Vite server in an isolated cloud sandbox.
              </p>
            </div>
          </div>
        )}
      </BrowserFrame>

      {runtime.status === "error" && runtime.error ? (
        <p className="shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-700 dark:text-amber-200">
          Live runtime unavailable: {runtime.error}. Trove is showing the instant snapshot instead.
        </p>
      ) : null}
    </div>
  );
}
