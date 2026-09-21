"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiPlus,
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
import { MobileViewport } from "@/components/mobile/viewport";
import type { Balance } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

interface Dest {
  href: string;
  label: string;
  icon: IconType;
}

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
  const [liveBalance, setLiveBalance] = React.useState<Balance | null>(balance);
  const closeNavigation = React.useCallback(() => setOpen(false), []);
  const studio = ["/chat", "/documents", "/spreadsheets", "/slides", "/design", "/research", "/code"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const immersive =
    pathname === "/websites" ||
    pathname.startsWith("/websites/") ||
    pathname.startsWith("/project/");

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/shell-meta", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { balance?: Balance | null };
      })
      .then((data) => {
        if (data) setLiveBalance(data.balance ?? null);
      })
      .catch(() => null);
    return () => controller.abort();
  }, []);

  const title = ALL.find((dest) => isActive(pathname, dest.href))?.label ?? "Trove";

  return (
    <div className={cn("nx-mobile bg-canvas", immersive || studio ? "mobile-viewport flex h-dvh min-h-0 flex-col overflow-hidden" : "min-h-dvh")}>
      <MobileViewport />
      {!immersive ? (
        <header className="nx-no-print sticky top-0 z-40 shrink-0 border-b border-line/70 bg-canvas/88 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[720px] items-center gap-2.5 px-3.5 sm:px-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-haspopup="dialog"
              aria-expanded={open}
              className="grid size-11 shrink-0 place-items-center rounded-xl text-ink transition hover:bg-hover active:scale-[.97]"
            >
              <Ico icon={TbLayoutSidebar} motion="panel" size={18} className="text-ink" />
            </button>

            <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Trove home">
              <TroveOrb size={22} state="idle" />
              <Wordmark size={15} sweep={false} />
            </Link>

            {title !== "Home" && title !== "Trove" ? (
              <>
                <span className="text-ink-4">/</span>
                <span className="min-w-0 truncate text-[12px] font-medium text-ink-3">{title}</span>
              </>
            ) : null}

            <span className="flex-1" />
            {liveBalance ? (
              <Link
                href="/plans"
                aria-label={`${liveBalance.remaining.toLocaleString()} credits remaining. View plan and usage`}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line/80 bg-raised/90 px-2.5 text-[12px] font-semibold tabular-nums text-ink-2 shadow-sm"
              >
                <span className="text-accent">✦</span>
                {new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(liveBalance.remaining)}
              </Link>
            ) : null}
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "min-h-0 min-w-0",
          immersive || studio
            ? "flex flex-1 flex-col overflow-hidden"
            : "min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))]",
        )}
      >
        {children}
      </main>

      <Drawer open={open} onClose={closeNavigation}>
        <div className="flex shrink-0 items-center justify-between border-b border-line/70 py-3 pl-4 pr-16">
          <span className="flex items-center gap-2.5">
            <TroveOrb size={24} state="idle" />
            <span>
              <Wordmark size={16} sweep={false} />
              <span className="mt-0.5 block text-[9.5px] text-ink-4">Workspace</span>
            </span>
          </span>
          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className="btn-grad inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-white"
          >
            <FiPlus size={14} />
            New
          </Link>
        </div>

        <nav aria-label="Main" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) closeNavigation(); }} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-4">
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
                        "flex min-h-11 items-center gap-2.5 rounded-[12px] px-2.5 text-[14px] font-medium transition-colors",
                        active ? "bg-accent/10 text-accent" : "text-ink-3 hover:bg-hover",
                      )}
                    >
                      <dest.icon size={15} className={active ? "text-accent" : "text-ink-3"} />
                      <span>{dest.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-3 pb-[calc(.7rem+env(safe-area-inset-bottom))] pt-3">
          {user ? (
            <div className="mb-2 flex items-center gap-2.5 rounded-[13px] border border-line/70 bg-sunk/40 p-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold text-ink">{user.name}</span>
                <span className="block truncate text-[9.5px] text-ink-4">{user.email}</span>
              </span>
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="grid size-8 place-items-center rounded-xl text-ink-3 hover:bg-hover"
                >
                  <Ico icon={TbLogout} motion="exit" size={14} className="text-ink-3" />
                </button>
              </form>
            </div>
          ) : null}
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-xl text-ink hover:bg-hover"
            >
              <Ico icon={TbSettings} motion="spin" size={17} className="text-ink" />
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
