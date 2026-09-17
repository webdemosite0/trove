"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderView as WorkspaceBuilderView } from "./builder-workspace";
import { BuilderCommandCenter } from "@/components/builder/builder-command-center";

/** User-facing site panes. Terminal/console is backend-only and never a route. */
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

  const setAddress = useCallback((next: SiteView, mode: "push" | "replace" = "push") => {
    const projectId = identity?.id;
    const href = routeUrl(next, projectId);
    if (mode === "replace") window.history.replaceState({}, "", href);
    else window.history.pushState({}, "", href);
  }, [identity?.id]);

  const selectView = useCallback(
    (next: SiteView) => {
      desiredView.current = next;
      setView(next);
    },
    [],
  );

  useEffect(() => {
    if (props.restored) {
      setIdentity(props.restored);
      setIdentityReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sites/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: props.draft?.slice(0, 48) || "Untitled site", idea: props.draft || "" }),
        });
        const data = (await res.json()) as { id?: string; title?: string; idea?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.id) {
          setIdentityError(data.error || "Could not create site");
          setIdentityReady(true);
          return;
        }
        setIdentity({ id: data.id, title: data.title || "Untitled site", idea: data.idea || props.draft || "" });
        setIdentityReady(true);
      } catch (e) {
        if (!cancelled) {
          setIdentityError(e instanceof Error ? e.message : "Could not create site");
          setIdentityReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.restored, props.draft]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest("button");
      if (!button || !root.contains(button)) return;

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
      {!props.mobile ? <BuilderCommandCenter /> : null}
    </div>
  );
}
