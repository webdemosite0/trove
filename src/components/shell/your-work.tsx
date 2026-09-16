"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  TbWorld,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbSearch,
  TbPresentation,
  TbPalette,
  TbUsers,
  TbMessageCircle,
  FiArrowRight,
} from "@/components/ui/icons";
import type { Recent, RecentKind } from "@/lib/recents";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const META: Record<RecentKind, { label: string; icon: IconType; tone: string }> = {
  chat: { label: "Chat", icon: TbMessageCircle, tone: "#a78bfa" },
  site: { label: "Site", icon: TbWorld, tone: "#38bdf8" },
  agent: { label: "Agent", icon: TbRobot, tone: "#c084fc" },
  team: { label: "Team", icon: TbUsers, tone: "#f472b6" },
  code: { label: "Code", icon: TbCode, tone: "#34d399" },
  docs: { label: "Doc", icon: TbFileText, tone: "#60a5fa" },
  sheets: { label: "Sheet", icon: TbTable, tone: "#4ade80" },
  slides: { label: "Slides", icon: TbPresentation, tone: "#fbbf24" },
  design: { label: "Design", icon: TbPalette, tone: "#f472b6" },
  research: { label: "Research", icon: TbSearch, tone: "#22d3ee" },
};

const PATH_KINDS: { match: (p: string) => boolean; kinds: RecentKind[] | "hide" | "all" }[] = [
  { match: (p) => p.startsWith("/websites"), kinds: ["site"] },
  { match: (p) => p.startsWith("/chat"), kinds: "hide" },
  { match: (p) => p.startsWith("/integrations"), kinds: "hide" },
  { match: (p) => p.startsWith("/plans"), kinds: "hide" },
  { match: (p) => p.startsWith("/settings"), kinds: "hide" },
  { match: (p) => p.startsWith("/documents"), kinds: ["docs"] },
  { match: (p) => p.startsWith("/spreadsheets"), kinds: ["sheets"] },
  { match: (p) => p.startsWith("/slides"), kinds: ["slides"] },
  { match: (p) => p.startsWith("/design"), kinds: ["design"] },
  { match: (p) => p.startsWith("/research"), kinds: ["research"] },
  { match: (p) => p.startsWith("/code"), kinds: ["code"] },
  { match: (p) => p.startsWith("/agents"), kinds: ["agent"] },
  { match: (p) => p.startsWith("/team"), kinds: ["team"] },
  { match: (p) => p.startsWith("/dashboard"), kinds: "all" },
];

function kindsForPath(pathname: string): RecentKind[] | "all" | "hide" {
  for (const rule of PATH_KINDS) {
    if (rule.match(pathname)) return rule.kinds;
  }
  return "all";
}

function SiteRecentCard({ recent }: { recent: Recent }) {
  const projectId = recent.conversationId;
  const href = projectId
    ? `/websites/preview?c=${encodeURIComponent(projectId)}`
    : recent.href || "/websites";
  const previewSrc = projectId
    ? `/api/builder/projects/${encodeURIComponent(projectId)}/preview`
    : null;

  return (
    <div className="group relative h-full overflow-hidden rounded-[18px] border border-line/80 bg-canvas/55 transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_18px_50px_-30px_rgba(124,92,255,0.5)]">
      <Link
        href={href}
        className="absolute inset-0 z-20 rounded-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Open ${recent.title || "website"} preview`}
      />

      <div className="relative aspect-[16/10] overflow-hidden border-b border-line/70 bg-sunk">
        {previewSrc ? (
          <iframe
            title={`${recent.title || "Website"} preview`}
            src={previewSrc}
            loading="lazy"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            tabIndex={-1}
            className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-25 border-0 bg-white"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(56,189,248,0.18),transparent_45%),linear-gradient(145deg,rgba(124,92,255,0.12),transparent)]">
            <TbWorld size={24} className="text-sky-400/80" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/[0.03]" />
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Preview
        </div>
      </div>

      <div className="flex items-center gap-3 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-sky-400/15 bg-sky-400/10 text-sky-400 transition group-hover:scale-105">
          <TbWorld size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink transition group-hover:text-accent">
            {recent.title || "Untitled site"}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-4">
            <span>Website</span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">{relativeTime(recent.createdAt)}</span>
          </span>
        </span>
        <FiArrowRight size={14} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
    </div>
  );
}

export function YourWork({
  items,
  className,
  kinds: kindsProp,
  title = "Pick up where you left off",
  emptyHint,
  force,
}: {
  items: Recent[];
  className?: string;
  kinds?: RecentKind | RecentKind[];
  title?: string;
  emptyHint?: string;
  force?: boolean;
}) {
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const hasThread = Boolean(search?.get("c"));
  const onSites = pathname.startsWith("/websites");

  // Hide while Sites builder is active (asking / planning / building / ready)
  const [builderBusy, setBuilderBusy] = useState(false);
  useEffect(() => {
    if (!onSites) {
      setBuilderBusy(false);
      return;
    }
    const sync = () => setBuilderBusy(document.body.hasAttribute("data-builder-phase"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-builder-phase"],
    });
    return () => obs.disconnect();
  }, [onSites]);

  if (!force && hasThread) return null;
  if (!force && onSites && builderBusy) return null;

  const auto = kindsForPath(pathname);
  if (!force && auto === "hide") return null;

  const allowed: RecentKind[] | null = kindsProp
    ? Array.isArray(kindsProp)
      ? kindsProp
      : [kindsProp]
    : auto === "all" || auto === "hide"
      ? null
      : auto;

  const filtered = allowed ? items.filter((r) => allowed.includes(r.kind)) : items;
  const shown = filtered.slice(0, 8);

  if (!shown.length) {
    if (!emptyHint) return null;
    return (
      <section
        className={cn("mx-auto w-full max-w-[1100px] px-5 pb-8 pt-4 lg:px-8", className)}
        aria-label="Your work"
      >
        <div className="nx-rise rounded-[20px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-4">
          {emptyHint}
        </div>
      </section>
    );
  }

  const heading = onSites ? "Your sites" : title;

  return (
    <section
      className={cn(
        "relative z-10 mx-auto w-full max-w-[1100px] shrink-0 px-5 pb-8 pt-4 lg:px-8",
        className,
      )}
      aria-label="Your work"
    >
      <div className="nx-rise overflow-hidden rounded-[24px] border border-line bg-gradient-to-br from-raised/95 via-rail/50 to-sunk/60 p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Your work
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-ink">{heading}</h2>
          </div>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink"
          >
            All work
            <FiArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </Link>
        </header>

        <ul className={cn("grid gap-2", onSites ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4")}>
          {shown.map((r, i) => {
            const m = META[r.kind] ?? META.chat;
            const Icon = m.icon;
            return (
              <li
                key={r.id}
                className="nx-in min-w-0"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                {r.kind === "site" ? (
                  <SiteRecentCard recent={r} />
                ) : (
                  <Link
                    href={r.href || "/chat"}
                    className="group flex h-full items-start gap-3 rounded-[16px] border border-line/80 bg-canvas/50 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-hover/40 hover:shadow-[0_12px_40px_-24px_rgba(124,92,255,0.45)]"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-[12px] border border-white/5 transition group-hover:scale-105"
                      style={{
                        background: `linear-gradient(145deg, color-mix(in oklab, ${m.tone} 55%, transparent), transparent)`,
                        color: m.tone,
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent">
                        {r.title || "Untitled"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-4">
                        <span>{m.label}</span>
                        <span className="opacity-40">·</span>
                        <span className="tabular-nums">{relativeTime(r.createdAt)}</span>
                      </span>
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
