"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiPlus,
  FiMoreHorizontal,
  TbHome,
  TbMessageCircle,
  TbRobot,
  TbWorld,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbSearch,
  TbUsers,
  TbBell,
  TbPlugConnected,
  TbSettings,
  TbLayoutSidebar,
  TbLogout,
} from "@/components/ui/icons";
import { logOut } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";
import { Drawer } from "@/components/mobile/drawer";
import type { Balance } from "@/lib/credits";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

interface Dest {
  href: string;
  label: string;
  icon: IconType;
}

const TABS: Dest[] = [
  { href: "/dashboard", label: "Home", icon: TbHome },
  { href: "/chat", label: "Chat", icon: TbMessageCircle },
  { href: "/websites", label: "Sites", icon: TbWorld },
  { href: "/documents", label: "Docs", icon: TbFileText },
];

const GROUPS: { label: string; items: Dest[] }[] = [
  {
    label: "Build",
    items: [
      { href: "/websites", label: "Sites", icon: TbWorld },
      { href: "/documents", label: "Docs", icon: TbFileText },
      { href: "/spreadsheets", label: "Sheets", icon: TbTable },
      { href: "/slides", label: "Decks", icon: TbPresentation },
      { href: "/design", label: "Design", icon: TbPalette },
      { href: "/agents", label: "Agents", icon: TbRobot },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: TbHome },
      { href: "/chat", label: "Chat", icon: TbMessageCircle },
      { href: "/research", label: "Research", icon: TbSearch },
      { href: "/team", label: "Team", icon: TbUsers },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/integrations", label: "Apps", icon: TbPlugConnected },
      { href: "/reminders", label: "Alerts", icon: TbBell },
      { href: "/settings", label: "Settings", icon: TbSettings },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileShell({
  children,
  user,
  balance,
}: {
  children: React.ReactNode;
  user: { name: string; email: string } | null;
  balance: Balance | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const [navPath, setNavPath] = React.useState(pathname);
  if (pathname !== navPath) {
    setNavPath(pathname);
    if (open) setOpen(false);
  }

  const title = ALL.find((d) => isActive(pathname, d.href))?.label ?? "Trove";
  const tabActive = TABS.some((t) => isActive(pathname, t.href));

  return (
    <div className="nx-mobile flex min-h-[100dvh] flex-col bg-canvas">
      <header className="nx-no-print sticky top-0 z-30 border-b border-line bg-canvas/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-2 px-3">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Trove">
            <TroveOrb size={22} state="idle" />
            <Wordmark size={14} sweep={false} />
          </Link>
          <span className="flex-1" />
          {balance ? (
            <Link
              href="/plans"
              className="flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[12px] font-medium tabular-nums text-ink-2"
            >
              <span className="text-accent">✦</span>
              {balance.remaining > 999
                ? `${Math.round(balance.remaining / 1000)}k`
                : balance.remaining}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-ink active:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={20} className="text-ink" />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        {title !== "Trove" ? (
          <p className="px-4 pt-3 text-[13px] font-medium text-ink-3">{title}</p>
        ) : null}
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="nx-no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <div className="flex h-[3.5rem] items-stretch justify-around px-1">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1",
                  active ? "text-accent" : "text-ink-3",
                )}
              >
                <t.icon
                  size={22}
                  strokeWidth={1.75}
                  className={active ? "text-accent" : "text-ink"}
                />
                <span className="truncate text-[10.5px] font-medium">{t.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1",
              !tabActive && open ? "text-accent" : "text-ink-3",
            )}
          >
            <FiMoreHorizontal size={22} strokeWidth={1.75} className="text-ink" />
            <span className="text-[10.5px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <span className="flex items-center gap-2">
            <TroveOrb size={26} state="idle" />
            <Wordmark size={16} sweep={false} />
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl text-ink active:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={19} className="text-ink" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/chat"
            className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-raised px-3.5 text-[15px] font-medium text-ink active:bg-hover"
          >
            <Ico icon={FiPlus} motion="grow" size={17} className="text-ink" />
            New chat
          </Link>
        </div>

        <nav aria-label="All" className="mt-3 flex-1 overflow-y-auto px-3 pb-2">
          {GROUPS.map((g, i) => (
            <div key={g.label} className={cn(i > 0 && "mt-4")}>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                {g.label}
              </div>
              <div className="space-y-0.5">
                {g.items.map((d) => {
                  const active = isActive(pathname, d.href);
                  return (
                    <Link
                      key={`${g.label}-${d.href}`}
                      href={d.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[14.5px] transition-colors",
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-ink-3 active:bg-hover",
                      )}
                    >
                      <d.icon
                        size={19}
                        className={cn("shrink-0", active ? "text-accent" : "text-ink")}
                      />
                      <span className={active ? "text-accent" : "text-ink-3"}>{d.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-3 py-3">
          {user ? (
            <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[12px] text-ink-4">{user.email}</span>
              </span>
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="grid h-9 w-9 place-items-center rounded-xl text-ink active:bg-hover"
                >
                  <Ico icon={TbLogout} motion="exit" size={17} className="text-ink" />
                </button>
              </form>
            </div>
          ) : null}
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid h-9 w-9 place-items-center rounded-xl text-ink active:bg-hover"
            >
              <Ico icon={TbSettings} motion="spin" size={19} className="text-ink" />
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
