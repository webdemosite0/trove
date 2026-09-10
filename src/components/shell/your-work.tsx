"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

/** Path prefix → which recent kinds belong on that page. */
const PATH_KINDS: { match: (p: string) => boolean; kinds: RecentKind[] | null }[] = [
  // Full-screen builder — strip is rendered inside the builder idle screen instead
  { match: (p) => p.startsWith("/websites"), kinds: null },
  { match: (p) => p.startsWith("/chat") || p === "/", kinds: ["chat"] },
  { match: (p) => p.startsWith("/documents"), kinds: ["docs"] },
  { match: (p) => p.startsWith("/spreadsheets"), kinds: ["sheets"] },
  { match: (p) => p.startsWith("/slides"), kinds: ["slides"] },
  { match: (p) => p.startsWith("/design"), kinds: ["design"] },
  { match: (p) => p.startsWith("/research"), kinds: ["research"] },
  { match: (p) => p.startsWith("/code"), kinds: ["code"] },
  { match: (p) => p.startsWith("/agents"), kinds: ["agent"] },
  { match: (p) => p.startsWith("/team"), kinds: ["team"] },
];

function kindsForPath(pathname: string): RecentKind[] | "all" | "hide" {
  for (const rule of PATH_KINDS) {
    if (rule.match(pathname)) {
      return rule.kinds === null ? "hide" : rule.kinds;
    }
  }
  return "all";
}

export function YourWork({
  items,
  className,
  /** Force a kind filter (e.g. builder idle: only sites). */
  kinds: kindsProp,
  title = "Pick up where you left off",
  emptyHint,
}: {
  items: Recent[];
  className?: string;
  kinds?: RecentKind | RecentKind[];
  title?: string;
  emptyHint?: string;
}) {
  const pathname = usePathname() || "/";
  const auto = kindsForPath(pathname);

  if (kindsProp == null && auto === "hide") return null;

  const allowed: RecentKind[] | null = kindsProp
    ? Array.isArray(kindsProp)
      ? kindsProp
      : [kindsProp]
    : auto === "all" || auto === "hide"
      ? null
      : auto;

  const filtered = allowed
    ? items.filter((r) => allowed.includes(r.kind))
    : items;
  const shown = filtered.slice(0, 8);

  if (!shown.length) {
    if (!emptyHint) return null;
    return (
      <section className={cn("mx-auto w-full max-w-[1100px] px-5 pb-8 pt-4 lg:px-8", className)} aria-label="Your work">
        <div className="rounded-[20px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-4">
          {emptyHint}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative z-10 mx-auto w-full max-w-[1100px] shrink-0 px-5 pb-8 pt-4 lg:px-8",
        className,
      )}
      aria-label="Your work"
    >
      <div className="overflow-hidden rounded-[24px] border border-line bg-gradient-to-br from-raised/95 via-rail/50 to-sunk/60 p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Your work
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-ink">{title}</h2>
          </div>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink"
          >
            All work
            <FiArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </Link>
        </header>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((r, i) => {
            const m = META[r.kind] ?? META.chat;
            const Icon = m.icon;
            return (
              <li key={r.id} className="nx-in min-w-0" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={r.href || "/chat"}
                  className="group flex h-full items-start gap-3 rounded-[16px] border border-line/80 bg-canvas/50 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-hover/40 hover:shadow-[0_12px_40px_-24px_rgba(124,92,255,0.45)]"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-[12px] border border-white/5"
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
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
