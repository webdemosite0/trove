"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderView as WorkspaceBuilderView } from "./builder-workspace";

export type SiteView = "chat" | "preview" | "files" | "code";

type RestoredSite = { id: string; title: string; idea: string };

type BuilderProps = {
  mobile?: boolean;
  draft?: string;
  restored?: RestoredSite | null;
  recentSites?: { id: string; title: string; href: string; createdAt: number }[];
  initialView?: SiteView;
};

const ROUTES: Record<SiteView, string> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
};

const MOBILE_LABELS: Record<SiteView, string> = {
  chat: "Chat",
  preview: "Preview",
  files: "Files",
  code: "Code",
};

const DESKTOP_INDEX: Partial<Record<SiteView, number>> = {
  preview: 0,
  files: 1,
  code: 2,
};

function viewFromPath(pathname: string): SiteView | null {
  const parts = pathname.split("/").filter(Boolean);
  let segment = "";

  if (parts[0] === "project") segment = parts[2]?.toLowerCase() || "";
  else if (parts[0] === "websites" && parts[1] === "project") {
    segment = parts[3]?.toLowerCase() || "";
  } else {
    segment = parts[1]?.toLowerCase() || "";
  }

  if (segment === "chat") return "chat";
  if (segment === "preview") return "preview";
  if (segment === "files") return "files";
  if (segment === "code") return "code";
  return null;
}

function routeUrl(view: SiteView, projectId?: string | null) {
  const url = new URL(window.location.href);
  if (projectId) {
    url.pathname = `/project/${encodeURIComponent(projectId)}/${ROUTES[view]}`;
    url.searchParams.delete("c");
    url.searchParams.delete("q");
  } else {
    url.pathname = `/websites/${ROUTES[view]}`;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function BuilderView({ initialView, ...props }: BuilderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const startingView = initialView ?? (props.restored ? (props.mobile ? "chat" : "preview") : "chat");
  const desiredView = useRef<SiteView>(startingView);
  const initialRoutePending = useRef(Boolean(initialView));
  const [view, setView] = useState<SiteView>(startingView);
  const [identity, setIdentity] = useState<RestoredSite | null>(props.restored ?? null);
  const [identityReady, setIdentityReady] = useState(Boolean(props.restored));
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    if (props.restored) {
      setIdentity(props.restored);
      setIdentityReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const idea = props.draft?.trim() || "";
        const res = await fetch("/api/builder/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: idea.slice(0, 60) || "Untitled site",
            prompt: idea,
            target: "react",
            status: "draft",
            files: [],
            previewHtml: null,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.id) {
          throw new Error(data?.error || "Could not create this site's workspace.");
        }
        if (cancelled) return;

        const created: RestoredSite = {
          id: String(data.id),
          title: idea.slice(0, 60) || "Untitled site",
          idea,
        };
        setIdentity(created);
        setIdentityReady(true);

        const nextUrl = routeUrl(desiredView.current, created.id);
        window.history.replaceState({ troveSiteView: desiredView.current }, "", nextUrl);
      } catch (error) {
        if (cancelled) return;
        setIdentityError(
          error instanceof Error ? error.message : "Could not create this site's workspace.",
        );
        setIdentityReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.draft, props.restored]);

  useEffect(() => {
    if (!identity?.id || typeof window === "undefined") return;
    const current = window.location.pathname;
    if (current.startsWith(`/project/${encodeURIComponent(identity.id)}/`)) return;

    const nextUrl = routeUrl(desiredView.current, identity.id);
    window.history.replaceState({ troveSiteView: desiredView.current }, "", nextUrl);
  }, [identity?.id]);

  const setAddress = useCallback(
    (next: SiteView, mode: "push" | "replace" = "replace") => {
      if (typeof window === "undefined") return;
      const nextUrl = routeUrl(next, identity?.id);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl === current) return;
      if (mode === "push") window.history.pushState({ troveSiteView: next }, "", nextUrl);
      else window.history.replaceState({ troveSiteView: next }, "", nextUrl);
    },
    [identity?.id],
  );

  const clickView = useCallback((next: SiteView) => {
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
  }, []);

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

  if (!identityReady) {
    return (
      <div className="grid h-full min-h-[60vh] place-items-center bg-canvas px-6 text-center">
        <div>
          <div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          <p className="text-[13px] font-medium text-ink">Creating this site's workspace…</p>
          <p className="mt-1 text-[11.5px] text-ink-4">One project, one page, one isolated runtime.</p>
        </div>
      </div>
    );
  }

  if (identityError || !identity) {
    return (
      <div className="grid h-full min-h-[60vh] place-items-center bg-canvas px-6 text-center">
        <div className="max-w-sm rounded-2xl border border-line bg-raised p-5 shadow-sm">
          <p className="text-[14px] font-semibold text-ink">Could not create site workspace</p>
          <p className="mt-2 text-[12.5px] leading-5 text-ink-4">
            {identityError || "Please reload and try again."}
          </p>
        </div>
      </div>
    );
  }

  const previewRouteClass =
    view === "preview"
      ? "bg-[#1b1b1c] [&>div>header]:hidden [&>div>div>aside]:hidden [&>div>nav]:hidden [&>div>div>main]:bg-[#1b1b1c]"
      : "";

  // Terminal execution remains available to Trove's backend agent, but there is
  // intentionally no user-facing terminal tab or route. The two selectors below
  // hide the legacy workspace controls while the backend API remains intact.
  const terminalHiddenClass =
    "[&_.trove-tab-active:last-of-type]:!hidden [&>div>nav>div]:!grid-cols-4 [&>div>nav>div>button:last-child]:!hidden";

  return (
    <div
      ref={rootRef}
      data-trove-site-view={view}
      data-trove-project-id={identity.id}
      className={`h-full min-h-0 ${previewRouteClass} ${terminalHiddenClass}`}
    >
      <WorkspaceBuilderView {...props} restored={identity} />
    </div>
  );
}
