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
import type { Balance } from "@/lib/credits";
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
  const immersive = pathname === "/websites" || pathname.startsWith("/websites/") || pathname.startsWith("/project/");

  React.useEffect(() => setOpen(false), [pathname]);

  const title = ALL.find((dest) => isActive(pathname, dest.href))?.label ?? "Trove";

  return (
    <div className="nx-mobile min-h-[100dvh] bg-canvas">
      {!immersive ? (
        <header className="nx-no-print sticky top-0 z-40 border-b border-line/70 bg-canvas/88 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[720px] items-center gap-2.5 px-3.5 sm:px-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid size-9 place-items-center rounded-xl text-ink transition hover:bg-hover active:scale-[.97]"
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
            {balance ? (
              <Link
                href="/plans"
                className="flex h-8 items-center gap-1.5 rounded-full border border-line/80 bg-raised/90 px-2.5 text-[10.5px] font-semibold tabular-nums text-ink-2 shadow-sm"
              >
                <span className="text-accent">✦</span>
                {balance.remaining > 999 ? `${Math.round(balance.remaining / 1000)}k` : balance.remaining}
              </Link>
            ) : null}
          </div>
        </header>
      ) : null}

      <main className={cn("min-h-0 min-w-0", immersive ? "h-[100dvh] overflow-hidden" : "min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))]")}>{children}</main>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between border-b border-line/70 px-4 pb-3 pt-[calc(.8rem+env(safe-area-inset-top))]">
          <span className="flex items-center gap-2.5">
            <TroveOrb size={24} state="idle" />
            <span>
              <Wordmark size={16} sweep={false} />
              <span className="mt-0.5 block text-[9.5px] text-ink-4">Build what’s next.</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-xl text-ink transition hover:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={18} className="text-ink" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/chat"
            className="flex h-10 items-center gap-2.5 rounded-[12px] bg-accent px-3 text-[12.5px] font-semibold text-white shadow-sm active:scale-[.99]"
          >
            <Ico icon={FiPlus} motion="grow" size={15} className="text-white" />
            New chat
          </Link>
        </div>

        <nav aria-label="All destinations" className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
          {GROUPS.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && "mt-5")}>
              <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-4">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((dest) => {
                  const active = isActive(pathname, dest.href);
                  return (
                    <Link
                      key={`${group.label}-${dest.href}`}
                      href={dest.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-2.5 rounded-[12px] px-2.5 text-[12.5px] font-medium transition-colors",
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
                <button type="submit" aria-label="Sign out" className="grid size-8 place-items-center rounded-xl text-ink-3 hover:bg-hover">
                  <Ico icon={TbLogout} motion="exit" size={14} className="text-ink-3" />
                </button>
              </form>
            </div>
          ) : null}
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <Link href="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-xl text-ink hover:bg-hover">
              <Ico icon={TbSettings} motion="spin" size={17} className="text-ink" />
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
