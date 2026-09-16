"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderView as WorkspaceBuilderView } from "./builder-workspace";

export type SiteView = "chat" | "preview" | "files" | "code" | "console";

type BuilderProps = {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
  recentSites?: { id: string; title: string; href: string; createdAt: number }[];
  initialView?: SiteView;
};

const ROUTES: Record<SiteView, string> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
  console: "terminal",
};

const MOBILE_LABELS: Record<SiteView, string> = {
  chat: "Chat",
  preview: "Preview",
  files: "Files",
  code: "Code",
  console: "Terminal",
};

const DESKTOP_INDEX: Partial<Record<SiteView, number>> = {
  preview: 0,
  files: 1,
  code: 2,
  console: 3,
};

function viewFromPath(pathname: string): SiteView | null {
  const segment = pathname.split("/").filter(Boolean)[1]?.toLowerCase();
  if (segment === "chat") return "chat";
  if (segment === "preview") return "preview";
  if (segment === "files") return "files";
  if (segment === "code") return "code";
  if (segment === "terminal" || segment === "console") return "console";
  return null;
}

function routeUrl(view: SiteView) {
  const url = new URL(window.location.href);
  url.pathname = `/websites/${ROUTES[view]}`;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function BuilderView({ initialView, ...props }: BuilderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const desiredView = useRef<SiteView>(initialView ?? (props.mobile ? "chat" : "preview"));
  const initialRoutePending = useRef(Boolean(initialView));
  const [view, setView] = useState<SiteView>(desiredView.current);

  const setAddress = useCallback((next: SiteView, mode: "push" | "replace" = "replace") => {
    if (typeof window === "undefined") return;
    const nextUrl = routeUrl(next);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === current) return;
    if (mode === "push") window.history.pushState({ troveSiteView: next }, "", nextUrl);
    else window.history.replaceState({ troveSiteView: next }, "", nextUrl);
  }, []);

  const clickView = useCallback(
    (next: SiteView) => {
      const root = rootRef.current;
      if (!root) return false;

      const mobileButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("nav button"));
      const mobileButton = mobileButtons.find(
        (button) => button.textContent?.trim() === MOBILE_LABELS[next],
      );
      if (mobileButton) {
        mobileButton.click();
        return true;
      }

      if (next === "chat") return true;
      const index = DESKTOP_INDEX[next];
      const desktopTabs = Array.from(
        root.querySelectorAll<HTMLButtonElement>("button.trove-tab-active"),
      );
      const desktopButton = typeof index === "number" ? desktopTabs[index] : undefined;
      if (desktopButton) {
        desktopButton.click();
        return true;
      }
      return false;
    },
    [],
  );

  const selectView = useCallback(
    (next: SiteView, historyMode?: "push" | "replace") => {
      desiredView.current = next;
      setView(next);
      if (historyMode) setAddress(next, historyMode);
      return clickView(next);
    },
    [clickView, setAddress],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyInitialRoute = () => {
      if (!initialRoutePending.current) return;
      if (clickView(desiredView.current)) {
        window.setTimeout(() => {
          initialRoutePending.current = false;
        }, 120);
      }
    };

    applyInitialRoute();
    const observer = new MutationObserver(() => {
      applyInitialRoute();

      const mobileButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("nav button"));
      const activeMobile = mobileButtons.find((button) =>
        button.className.includes("bg-accent/12"),
      );
      if (activeMobile) {
        const found = (Object.keys(MOBILE_LABELS) as SiteView[]).find(
          (key) => activeMobile.textContent?.trim() === MOBILE_LABELS[key],
        );
        if (found && !initialRoutePending.current && found !== desiredView.current) {
          desiredView.current = found;
          setView(found);
          setAddress(found, "replace");
        }
        return;
      }

      const desktopTabs = Array.from(
        root.querySelectorAll<HTMLButtonElement>("button.trove-tab-active"),
      );
      const activeIndex = desktopTabs.findIndex((button) =>
        button.className.includes("bg-accent/15"),
      );
      if (activeIndex >= 0 && !initialRoutePending.current) {
        const found = (Object.keys(DESKTOP_INDEX) as SiteView[]).find(
          (key) => DESKTOP_INDEX[key] === activeIndex,
        );
        if (found && found !== desiredView.current) {
          desiredView.current = found;
          setView(found);
          setAddress(found, "replace");
        }
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [clickView, setAddress]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest("button");
      if (!button || !root.contains(button)) return;

      if (button.closest("nav")) {
        const found = (Object.keys(MOBILE_LABELS) as SiteView[]).find(
          (key) => button.textContent?.trim() === MOBILE_LABELS[key],
        );
        if (found) {
          desiredView.current = found;
          initialRoutePending.current = false;
          setView(found);
          setAddress(found, "push");
        }
        return;
      }

      if (button.classList.contains("trove-tab-active")) {
        const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("button.trove-tab-active"));
        const index = tabs.indexOf(button as HTMLButtonElement);
        const found = (Object.keys(DESKTOP_INDEX) as SiteView[]).find(
          (key) => DESKTOP_INDEX[key] === index,
        );
        if (found) {
          desiredView.current = found;
          initialRoutePending.current = false;
          setView(found);
          setAddress(found, "push");
        }
      }
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [setAddress]);

  useEffect(() => {
    const onPopState = () => {
      const next = viewFromPath(window.location.pathname);
      if (!next) return;
      initialRoutePending.current = false;
      selectView(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectView]);

  const previewRouteClass =
    view === "preview"
      ? "bg-[#1b1b1c] [&>div>header]:hidden [&>div>div>aside]:hidden [&>div>nav]:hidden [&>div>div>main]:bg-[#1b1b1c]"
      : "";

  return (
    <div
      ref={rootRef}
      data-trove-site-view={view}
      className={`h-full min-h-0 ${previewRouteClass}`}
    >
      <WorkspaceBuilderView {...props} />
    </div>
  );
}
