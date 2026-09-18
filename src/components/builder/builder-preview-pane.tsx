"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BrowserFrame,
  type PreviewDestination,
} from "@/components/builder/browser-frame";
import { PublishPanel } from "@/components/builder/publish-panel";
import type { ProjectFile } from "@/lib/builder";
import {
  getLocalRuntimeSnapshot,
  subscribeLocalRuntime,
  syncLocalProject,
} from "@/lib/browser-runtime";

/**
 * Full-height project preview. Clean Trove chrome — no product-clone UI.
 */
export function BuilderPreviewPane({
  preview,
  files = [],
  onRefresh,
  onNavigate,
  publishControl,
  activeTab = "preview",
}: {
  preview: string | null;
  files?: ProjectFile[];
  sandboxUrl?: string | null;
  onSandboxError?: () => void;
  onRefresh?: () => void;
  onNavigate?: (destination: PreviewDestination) => void;
  publishControl?: ReactNode;
  pageTitle?: string;
  activeTab?: "preview" | "files" | "code";
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
        // keep fallback
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

    if (destination === "files" || destination === "code") {
      const indexMap: Record<"files" | "code", number> = {
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

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-canvas">
      <BrowserFrame
        url={displayUrl}
        status={chromeStatus}
        activeTab={activeTab}
        publishControl={realPublishControl}
        onNavigate={navigate}
        onOpen={useLive || preview ? openPreview : undefined}
        onRefresh={() => {
          setRefreshKey((value) => value + 1);
          if (files.length && projectId) void syncLocalProject(files, projectId);
          onRefresh?.();
        }}
        className="h-full min-h-0"
      >
        {useLive && runtime.url ? (
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
          <div className="grid h-full min-h-[280px] place-items-center bg-canvas px-6 text-center">
            <div className="max-w-sm">
              <p className="text-[15px] font-semibold tracking-tight text-ink">No preview yet</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                Describe what to build in chat. When files are ready, the preview shows up here.
              </p>
            </div>
          </div>
        )}
      </BrowserFrame>

      {runtime.status === "error" ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-50 max-w-[340px] rounded-[var(--r-panel)] border border-line bg-raised px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-2 shadow-[var(--sh-2)]">
          Preview is reconnecting. Showing the last saved snapshot if available.
        </div>
      ) : null}
    </div>
  );
}
