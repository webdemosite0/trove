"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BrowserFrame,
  type PreviewDestination,
} from "@/components/builder/browser-frame";
import { EmbeddedBrowserFrame } from "@/components/builder/embedded-browser-frame";
import { PublishPanel } from "@/components/builder/publish-panel";
import type { ProjectFile } from "@/lib/builder";
import {
  getLocalRuntimeSnapshot,
  subscribeLocalRuntime,
  syncLocalProject,
} from "@/lib/browser-runtime";

type PreviewRuntimeStatus = "idle" | "booting" | "syncing" | "installing" | "starting" | "ready" | "error";

const RUNTIME_ACTIVITY: Record<PreviewRuntimeStatus, { kind: "thinking" | "reading" | "command" | "preview" | "error"; label: string; active: boolean }> = {
  idle: { kind: "thinking", label: "Preview runtime is idle", active: false },
  booting: { kind: "thinking", label: "Starting isolated project runtime", active: true },
  syncing: { kind: "reading", label: "Syncing project files to runtime", active: true },
  installing: { kind: "command", label: "Installing project dependencies", active: true },
  starting: { kind: "command", label: "Starting Vite preview server", active: true },
  ready: { kind: "preview", label: "localhost:5173 is ready", active: false },
  error: { kind: "error", label: "Preview runtime failed", active: false },
};

/**
 * Full-height project preview backed by the reusable E2B runtime.
 * Every site is keyed to its own project id so one project's sandbox/preview
 * can never become another project's live iframe.
 */
export function BuilderPreviewPane({
  preview,
  files = [],
  onRefresh,
  onNavigate,
  publishControl,
  pageTitle = "Homepage",
  embedded = false,
  onRuntimeState,
}: {
  preview: string | null;
  files?: ProjectFile[];
  sandboxUrl?: string | null;
  onSandboxError?: () => void;
  onRefresh?: () => void;
  onNavigate?: (destination: PreviewDestination) => void;
  publishControl?: ReactNode;
  pageTitle?: string;
  /** Light browser chrome for the split builder; dark chrome for dedicated Preview. */
  embedded?: boolean;
  /** Reports real E2B/Vite lifecycle states to the agent activity feed. */
  onRuntimeState?: (status: PreviewRuntimeStatus, error?: string | null) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topLevelProjectId = pathname?.match(/^\/project\/([^/]+)(?:\/|$)/i)?.[1];
  const legacyProjectId = pathname?.match(/^\/websites\/project\/([^/]+)(?:\/|$)/i)?.[1];
  const routeProjectId = topLevelProjectId || legacyProjectId;
  const projectId =
    searchParams?.get("c")?.trim() ||
    (routeProjectId ? decodeURIComponent(routeProjectId).trim() : "") ||
    null;

  const [runtime, setRuntime] = useState(() => getLocalRuntimeSnapshot(projectId));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => subscribeLocalRuntime(setRuntime, projectId), [projectId]);
  useEffect(() => {
    const status = runtime.status as PreviewRuntimeStatus;
    onRuntimeState?.(status, runtime.error || null);
    const activity = RUNTIME_ACTIVITY[status];
    if (activity && status !== "idle") {
      window.dispatchEvent(new CustomEvent("trove:builder-runtime", {
        detail: {
          kind: activity.kind,
          label: activity.label,
          detail: runtime.error || null,
          state: status === "error" ? "error" : activity.active ? "active" : "done",
        },
      }));
    }
  }, [runtime.status, runtime.error, onRuntimeState]);

  const filesKey = useMemo(
    () => files.map((file) => `${file.path}:${file.content.length}`).join("|"),
    [files],
  );

  useEffect(() => {
    if (!files.length || !projectId) return;
    void syncLocalProject(files, projectId);
  }, [files, filesKey, projectId]);

  const useLive = runtime.status === "ready" && Boolean(runtime.url);
  const useSnapshot = Boolean(preview) && !useLive;
  const displayUrl = useLive
    ? `localhost:${runtime.port || 5173}`
    : preview
      ? "localhost:5173"
      : "about:blank";

  const publishTitle = useMemo(() => {
    const index = files.find(
      (file) => file.path === "index.html" || file.path.endsWith("/index.html"),
    );
    const htmlTitle = index?.content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    if (htmlTitle) return htmlTitle.slice(0, 80);

    const packageFile = files.find((file) => file.path === "package.json");
    if (packageFile) {
      try {
        const data = JSON.parse(packageFile.content) as { name?: string };
        if (data.name?.trim()) return data.name.trim().slice(0, 80);
      } catch {
        // Keep the friendly fallback below.
      }
    }
    return "Website";
  }, [files]);

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

  const navigate = (destination: PreviewDestination) => {
    if (onNavigate) {
      onNavigate(destination);
      return;
    }

    const root = document.querySelector<HTMLElement>("[data-trove-site-view]");
    const mobileButtons = Array.from(root?.querySelectorAll<HTMLButtonElement>("nav button") || []);
    const label = destination.charAt(0).toUpperCase() + destination.slice(1);
    const mobileButton = mobileButtons.find((button) => button.textContent?.trim() === label);
    if (mobileButton) {
      mobileButton.click();
      return;
    }

    if (destination !== "chat") {
      const indexMap: Record<Exclude<PreviewDestination, "chat">, number> = {
        files: 1,
        code: 2,
      };
      const desktopTabs = Array.from(
        root?.querySelectorAll<HTMLButtonElement>("button.trove-tab-active") || [],
      );
      desktopTabs[indexMap[destination]]?.click();
      return;
    }

    const url = new URL(window.location.href);
    url.pathname = projectId
      ? `/project/${encodeURIComponent(projectId)}/chat`
      : "/websites/chat";
    url.searchParams.delete("c");
    window.location.assign(url.toString());
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

  const realPublishControl =
    publishControl ?? (
      <PublishPanel
        files={files}
        projectId={projectId}
        title={publishTitle}
        previewHtml={preview}
      />
    );

  const previewBody = useLive && runtime.url ? (
    <iframe
      key={`${projectId || "site"}:${runtime.url}:${refreshKey}`}
      title="Live site preview"
      src={runtime.url}
      className="absolute inset-0 h-full w-full border-0 bg-white"
      allow="accelerometer; camera; geolocation; microphone; clipboard-write; fullscreen"
      referrerPolicy="no-referrer"
    />
  ) : useSnapshot && preview ? (
    <iframe
      key={`${projectId || "site"}:${preview.slice(0, 80)}:${refreshKey}`}
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
          <span className="font-mono text-[15px] font-semibold text-black/65">{"//"}</span>
        </div>
        <p className="text-[15px] font-semibold tracking-tight">Live preview</p>
        <p className="mt-2 text-[12.5px] leading-5 text-black/42">
          Trove will show this project's isolated preview here as soon as the first files are ready.
        </p>
      </div>
    </div>
  );

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    if (files.length && projectId) void syncLocalProject(files, projectId);
    onRefresh?.();
  };

  return (
    <div className={embedded ? "relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#f7f6f3]" : "relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#1b1b1c]"}>
      {embedded ? (
        <EmbeddedBrowserFrame
          status={chromeStatus}
          publishControl={realPublishControl}
          onOpen={useLive || preview ? openPreview : undefined}
          onRefresh={refresh}
          className="h-full min-h-0"
        >
          {previewBody}
        </EmbeddedBrowserFrame>
      ) : (
        <BrowserFrame
          url={displayUrl}
          pageTitle={pageTitle}
          status={chromeStatus}
          publishControl={realPublishControl}
          onNavigate={navigate}
          onOpen={useLive || preview ? openPreview : undefined}
          onRefresh={refresh}
          className="h-full min-h-0"
        >
          {previewBody}
        </BrowserFrame>
      )}

      {runtime.status === "error" && runtime.error ? (
        <div className={embedded
          ? "pointer-events-none absolute bottom-4 left-4 z-50 max-w-[340px] rounded-2xl border border-amber-500/15 bg-white/95 px-3.5 py-2.5 text-[11.5px] leading-5 text-amber-800 shadow-xl backdrop-blur-xl"
          : "pointer-events-none absolute bottom-5 left-6 z-50 max-w-[360px] rounded-2xl border border-amber-400/20 bg-[#242426]/95 px-3.5 py-2.5 text-[11.5px] leading-5 text-amber-100 shadow-2xl backdrop-blur-xl"}
        >
          Live runtime unavailable: {runtime.error}. Showing this project's saved snapshot.
        </div>
      ) : null}
    </div>
  );
}
