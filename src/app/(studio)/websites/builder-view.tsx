"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderView as WorkspaceBuilderView } from "./builder-workspace";

/** User-facing site panes. Preview is an internal builder pane, not a page. */
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
  preview: "chat",
  files: "files",
  code: "code",
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
  else if (parts[0] === "websites" && parts[1] === "project") segment = parts[3]?.toLowerCase() || "";
  else segment = parts[1]?.toLowerCase() || "";
  if (segment === "chat" || segment === "preview") return "chat";
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

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      error:
        res.status === 401
          ? "Sign in with Google or email to create a site."
          : res.status === 404
            ? "Create API is missing on this deploy. Redeploy and try again."
            : `Server returned a non-JSON response (${res.status}).`,
    };
  }
}

async function createSiteIdentity(title: string, idea: string) {
  const body = JSON.stringify({ title, idea, name: title, prompt: idea, status: "draft" });

  let res = await fetch("/api/sites/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, idea }),
  });
  let data = await readJson(res);

  if (res.status === 404 || (data && !data.id && String(data.error || "").includes("missing"))) {
    res = await fetch("/api/builder/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    data = await readJson(res);
  }

  return { res, data };
}

export function BuilderView({ initialView, ...props }: BuilderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const startingView = initialView ?? "chat";
  const desiredView = useRef<SiteView>(startingView);
  const initialRoutePending = useRef(Boolean(initialView));
  const [view, setView] = useState<SiteView>(startingView);
  const [identity, setIdentity] = useState<RestoredSite | null>(props.restored ?? null);
  const [identityReady, setIdentityReady] = useState(Boolean(props.restored));
  const [identityError, setIdentityError] = useState<string | null>(null);

  const setAddress = useCallback(
    (next: SiteView, mode: "push" | "replace" = "push") => {
      const href = routeUrl(next, identity?.id);
      if (mode === "replace") window.history.replaceState({}, "", href);
      else window.history.pushState({}, "", href);
    },
    [identity?.id],
  );

  const selectView = useCallback((next: SiteView) => {
    desiredView.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    if (props.restored) {
      setIdentity(props.restored);
      setIdentityReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const title = props.draft?.slice(0, 48) || "Untitled site";
        const idea = props.draft || "";
        const { res, data } = await createSiteIdentity(title, idea);
        if (cancelled) return;

        const id = data && typeof data.id === "string" ? data.id : null;
        if (!res.ok || !id) {
          const err =
            (data && typeof data.error === "string" && data.error) ||
            (res.status === 401
              ? "Sign in with Google or email to create a site workspace."
              : "Could not create site");
          setIdentityError(err);
          setIdentityReady(true);
          return;
        }

        setIdentity({
          id,
          title: (data && typeof data.title === "string" && data.title) || title,
          idea: (data && typeof data.idea === "string" && data.idea) || idea,
        });
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
          <a
            href="/login"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-[13px] font-medium text-white"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const terminalHiddenClass =
    "[&_.trove-tab-active:last-of-type]:!hidden [&>div>nav>div]:!grid-cols-4 [&>div>nav>div>button:last-child]:!hidden";

  return (
    <div
      ref={rootRef}
      data-trove-site-view={view}
      data-trove-project-id={identity.id}
      className={`relative h-full min-h-0 overflow-hidden ${terminalHiddenClass}`}
    >
      <WorkspaceBuilderView {...props} restored={identity} />
    </div>
  );
}
