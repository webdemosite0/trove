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
    label: "Create",
    items: [
      { href: "/websites", label: "Sites", icon: TbWorld },
      { href: "/documents", label: "Documents", icon: TbFileText },
      { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable },
      { href: "/slides", label: "Slides", icon: TbPresentation },
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
    label: "Account",
    items: [
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected },
      { href: "/reminders", label: "Reminders", icon: TbBell },
      { href: "/settings", label: "Settings", icon: TbSettings },
    ],
  },
];

const ALL = GROUPS.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const immersive = pathname === "/websites" || pathname.startsWith("/websites/");

  const [navPath, setNavPath] = React.useState(pathname);
  if (pathname !== navPath) {
    setNavPath(pathname);
    if (open) setOpen(false);
  }

  const title = ALL.find((dest) => isActive(pathname, dest.href))?.label ?? "Trove";
  const tabActive = TABS.some((tab) => isActive(pathname, tab.href));

  return (
    <div className="nx-mobile flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-canvas">
      {!immersive ? (
        <header className="nx-no-print relative z-30 shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-2.5 px-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="Trove home">
              <span className="grid size-8 shrink-0 place-items-center rounded-[12px] border border-line/80 bg-raised shadow-sm">
                <TroveOrb size={21} state="idle" />
              </span>
              <span className="min-w-0">
                {title === "Home" ? (
                  <Wordmark size={14} sweep={false} />
                ) : (
                  <span className="block truncate text-[14px] font-semibold tracking-[-0.02em] text-ink">
                    {title}
                  </span>
                )}
              </span>
            </Link>

            <span className="flex-1" />
            {balance ? (
              <Link
                href="/plans"
                className="flex h-8 items-center gap-1.5 rounded-full border border-line/80 bg-raised/80 px-2.5 text-[11.5px] font-semibold tabular-nums text-ink-2 shadow-sm backdrop-blur"
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
              className="grid size-9 place-items-center rounded-[13px] border border-line/70 bg-raised/75 text-ink shadow-sm active:scale-[.97] active:bg-hover"
            >
              <Ico icon={TbLayoutSidebar} motion="panel" size={18} className="text-ink" />
            </button>
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "min-h-0 min-w-0 flex-1",
          immersive
            ? "overflow-hidden"
            : "overflow-y-auto pb-[calc(5.75rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>

      {!immersive ? (
        <nav
          aria-label="Primary"
          className="nx-no-print fixed inset-x-3 bottom-[calc(.65rem+env(safe-area-inset-bottom))] z-30 rounded-[23px] border border-line/80 bg-raised/90 p-1.5 shadow-[0_18px_55px_rgba(15,23,42,.16)] backdrop-blur-xl"
        >
          <div className="grid h-[3.6rem] grid-cols-5 gap-0.5">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 transition active:scale-[.97]",
                    active ? "bg-accent/10 text-accent" : "text-ink-4",
                  )}
                >
                  <tab.icon
                    size={19}
                    strokeWidth={1.8}
                    className={active ? "text-accent" : "text-ink-3"}
                  />
                  <span className={cn("truncate text-[9.5px] font-semibold", active && "text-accent")}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 transition active:scale-[.97]",
                !tabActive && open ? "bg-accent/10 text-accent" : "text-ink-4",
              )}
            >
              <FiMoreHorizontal size={20} strokeWidth={1.8} className="text-ink-3" />
              <span className="text-[9.5px] font-semibold">More</span>
            </button>
          </div>
        </nav>
      ) : null}

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
          <span className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[13px] border border-line bg-raised shadow-sm">
              <TroveOrb size={23} state="idle" />
            </span>
            <Wordmark size={16} sweep={false} />
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-xl text-ink active:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={18} className="text-ink" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <Link
            href="/chat"
            className="flex h-11 items-center gap-2.5 rounded-[14px] bg-accent px-3.5 text-[13.5px] font-semibold text-white shadow-sm active:scale-[.99]"
          >
            <Ico icon={FiPlus} motion="grow" size={16} className="text-white" />
            New chat
          </Link>
        </div>

        <nav aria-label="All destinations" className="mt-4 flex-1 overflow-y-auto px-3 pb-2">
          {GROUPS.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && "mt-5")}>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-ink-4">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((dest) => {
                  const active = isActive(pathname, dest.href);
                  return (
                    <Link
                      key={`${group.label}-${dest.href}`}
                      href={dest.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-ink-3 active:bg-hover",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-[9px]",
                          active ? "bg-accent/10" : "bg-sunk",
                        )}
                      >
                        <dest.icon
                          size={16}
                          className={active ? "text-accent" : "text-ink-3"}
                        />
                      </span>
                      <span>{dest.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3">
          {user ? (
            <div className="mb-2 flex items-center gap-3 rounded-[15px] border border-line/70 bg-sunk/45 p-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-[13px] font-semibold text-accent">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[10.5px] text-ink-4">{user.email}</span>
              </span>
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="grid size-8 place-items-center rounded-xl text-ink-3 active:bg-hover"
                >
                  <Ico icon={TbLogout} motion="exit" size={15} className="text-ink-3" />
                </button>
              </form>
            </div>
          ) : null}
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-xl text-ink active:bg-hover"
            >
              <Ico icon={TbSettings} motion="spin" size={18} className="text-ink" />
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
