"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AgenticBuilderWorkspace } from "./agentic-builder-workspace";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";

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

const SPLIT_STORAGE_KEY = "trove.builder.chat-width.v2";
const DEFAULT_CHAT_PERCENT = 42;

function viewFromPath(pathname: string): SiteView | null {
  const parts = pathname.split("/").filter(Boolean);
  let segment = "";

  if (parts[0] === "project") segment = parts[2]?.toLowerCase() || "";
  else if (parts[0] === "websites" && parts[1] === "project") {
    segment = parts[3]?.toLowerCase() || "";
  } else {
    segment = parts[1]?.toLowerCase() || "";
  }

  return isSiteView(segment) ? segment : null;
}

function isSiteView(value: string): value is SiteView {
  return value === "chat" || value === "preview" || value === "files" || value === "code";
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

function clampSplit(value: number, width?: number) {
  // Keep both the conversation and the work surface useful on normal laptops.
  // On very wide screens the percentage itself remains the constraint.
  if (!width || width <= 0) return Math.min(62, Math.max(30, value));
  const minChatPercent = (320 / width) * 100;
  const maxChatPercent = ((width - 360) / width) * 100;
  const low = Math.max(28, minChatPercent);
  const high = Math.min(62, Math.max(low, maxChatPercent));
  return Math.min(high, Math.max(low, value));
}

export function BuilderView({ initialView, ...props }: BuilderProps) {
  const { collapsed } = useNav();
  const startingView = initialView ?? (props.restored ? (props.mobile ? "chat" : "preview") : "chat");
  const desiredView = useRef<SiteView>(startingView);
  const rootRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef(DEFAULT_CHAT_PERCENT);

  const [view, setView] = useState<SiteView>(startingView);
  const [identity, setIdentity] = useState<RestoredSite | null>(props.restored ?? null);
  const [identityReady, setIdentityReady] = useState(Boolean(props.restored));
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [chatPercent, setChatPercent] = useState(DEFAULT_CHAT_PERCENT);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      const next = clampSplit(saved, rootRef.current?.getBoundingClientRect().width);
      splitRef.current = next;
      setChatPercent(next);
    }
  }, []);

  useEffect(() => {
    desiredView.current = view;
  }, [view]);

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

  const selectView = useCallback(
    (next: SiteView, mode: "push" | "replace" = "push") => {
      desiredView.current = next;
      setView(next);
      setAddress(next, mode);
    },
    [setAddress],
  );

  // The builder itself reads the URL to choose its right-hand surface. We only
  // translate deliberate UI clicks into history changes; there is no DOM
  // mutation observer and no programmatic button clicking anymore.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest("button");
      if (!button || !root.contains(button)) return;
      const label = button.textContent?.trim().toLowerCase() || "";

      let next: SiteView | null = null;
      if ((button.closest("nav") || button.classList.contains("trove-tab-active")) && isSiteView(label)) {
        next = label;
      } else if (label === "open preview") {
        next = "preview";
      } else if (view === "code" && label === "files") {
        next = "files";
      } else if (view === "files" && button.querySelector("span.font-mono")) {
        next = "code";
      }

      if (next && next !== desiredView.current) selectView(next, "push");
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [selectView, view]);

  useEffect(() => {
    const onPopState = () => {
      const next = viewFromPath(window.location.pathname);
      if (!next) return;
      desiredView.current = next;
      setView(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (props.mobile || view === "preview") return;
      const root = rootRef.current;
      if (!root) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      if (!rect.width) return;

      setResizing(true);
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (moveEvent: PointerEvent) => {
        const raw = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const next = clampSplit(raw, rect.width);
        splitRef.current = next;
        setChatPercent(next);
      };

      const finish = () => {
        setResizing(false);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.localStorage.setItem(SPLIT_STORAGE_KEY, String(splitRef.current));
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish, { once: true });
    },
    [props.mobile, view],
  );

  const nudgeSplit = useCallback((delta: number) => {
    const width = rootRef.current?.getBoundingClientRect().width;
    const next = clampSplit(splitRef.current + delta, width);
    splitRef.current = next;
    setChatPercent(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(next));
    }
  }, []);

  if (!identityReady) {
    return (
      <div className="grid h-full min-h-[60vh] place-items-center bg-[#f7f6f3] px-6 text-center text-[#171719]">
        <div>
          <div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-black/10 border-t-black/70" />
          <p className="text-[13px] font-medium">Creating this site's workspace…</p>
          <p className="mt-1 text-[11.5px] text-black/38">One project, one page, one isolated runtime.</p>
        </div>
      </div>
    );
  }

  if (identityError || !identity) {
    return (
      <div className="grid h-full min-h-[60vh] place-items-center bg-[#f7f6f3] px-6 text-center text-[#171719]">
        <div className="max-w-sm rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <p className="text-[14px] font-semibold">Could not create site workspace</p>
          <p className="mt-2 text-[12.5px] leading-5 text-black/44">
            {identityError || "Please reload and try again."}
          </p>
        </div>
      </div>
    );
  }

  const dedicatedPreview = view === "preview";
  const previewRouteClass = dedicatedPreview
    ? "bg-[#1b1b1c] [&>div>header]:hidden [&>div>div>aside]:hidden [&>div>div>main]:bg-[#1b1b1c]"
    : "";
  const splitClass = !props.mobile && !dedicatedPreview
    ? "[&>div>div>aside]:!w-[var(--trove-chat-width)] [&>div>div>aside]:!min-w-0 [&>div>div>aside]:!max-w-none [&>div>div>aside]:!flex-none [&>div>div>main]:min-w-[320px]"
    : "";

  return (
    <div
      ref={rootRef}
      data-trove-site-view={view}
      data-trove-project-id={identity.id}
      data-shell-collapsed={collapsed ? "true" : "false"}
      data-resizing={resizing ? "true" : "false"}
      className={cn("relative h-full min-h-0 overflow-hidden", previewRouteClass, splitClass)}
      style={{ "--trove-chat-width": `${chatPercent}%` } as CSSProperties}
    >
      <AgenticBuilderWorkspace {...props} restored={identity} />

      {!props.mobile && !dedicatedPreview ? (
        <div
          role="separator"
          aria-label="Resize chat and work area"
          aria-orientation="vertical"
          aria-valuemin={30}
          aria-valuemax={62}
          aria-valuenow={Math.round(chatPercent)}
          tabIndex={0}
          onPointerDown={beginResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudgeSplit(-2);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudgeSplit(2);
            } else if (event.key === "Home") {
              event.preventDefault();
              const next = clampSplit(34, rootRef.current?.getBoundingClientRect().width);
              splitRef.current = next;
              setChatPercent(next);
            } else if (event.key === "End") {
              event.preventDefault();
              const next = clampSplit(54, rootRef.current?.getBoundingClientRect().width);
              splitRef.current = next;
              setChatPercent(next);
            }
          }}
          className={cn(
            "group absolute bottom-0 top-[52px] z-20 w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none",
            "after:absolute after:bottom-0 after:left-1/2 after:top-0 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors",
            "hover:after:bg-black/12 focus-visible:after:bg-black/22",
            resizing && "after:bg-black/20",
          )}
          style={{ left: `${chatPercent}%` }}
        >
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/0 transition-colors group-hover:bg-black/12 group-focus-visible:bg-black/18" />
        </div>
      ) : null}
    </div>
  );
}
