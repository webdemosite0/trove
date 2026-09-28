"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiPlus,
  FiSettings,
  FiCreditCard,
  FiLogOut,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiX,
  TbLayoutDashboard,
  TbMessageCircle,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbWorld,
  TbRobot,
  TbFolder,
  TbHelpCircle,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip";

type Item = {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
  teamOnly?: boolean;
};

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/websites", label: "Websites", icon: TbWorld, motion: "grow" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "ring" },
  { href: "/team", label: "Team", icon: FiUsers, motion: "stack", teamOnly: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/home";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  pathname,
  onNavigate,
  compact,
}: {
  item: Item;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const active = isActive(pathname, item.href);
  if (compact) {
    return (
      <Tooltip label={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-9 place-items-center rounded-lg transition-colors",
            active ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          <Ico icon={item.icon} motion={item.motion} size={17} active={active} />
        </Link>
      </Tooltip>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors",
        active ? "bg-hover font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Ico
        icon={item.icon}
        motion={item.motion}
        size={17}
        active={active}
        className={cn("shrink-0", active ? "text-ink" : "text-ink-3")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  user,
  balance,
  teamEligible = false,
}: {
  user: User | null;
  balance: Balance | null;
  teamEligible?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useNav();
  const [liveBalance, setLiveBalance] = useState(balance);

  useEffect(() => {
    setLiveBalance(balance);
  }, [balance]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const credits =
    liveBalance && typeof liveBalance.remaining === "number"
      ? liveBalance.remaining
      : null;

  const rail = (
    <div className="flex h-full flex-col bg-rail">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-3">
        <Link href="/chat" onClick={() => setMobileOpen(false)} className="flex min-w-0 flex-1 items-center gap-2">
          <TroveOrb size={28} />
          {!collapsed ? <Wordmark size={18} /> : null}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          className="hidden size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink lg:grid"
        >
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink lg:hidden"
        >
          <FiX size={16} />
        </button>
      </div>

      <div className="px-2.5 py-2">
        <Link
          href="/chat"
          onClick={() => setMobileOpen(false)}
          className="btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white"
        >
          <Ico icon={FiPlus} motion="grow" size={15} />
          {!collapsed ? "New chat" : null}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
        {PRIMARY.filter((it) => !it.teamOnly || teamEligible).map((it) => (
          <NavRow
            key={it.href}
            item={it}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            compact={collapsed}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-2.5">
        {user ? (
          <>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line">
                  {(user.name || "T").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
                  <span className="block truncate text-[11px] text-ink-4">
                    {user.email}
                    {credits != null ? ` · ${credits.toLocaleString()} cr` : ""}
                  </span>
                </span>
              </div>
            ) : null}
            <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
              <Tooltip label="Settings" side="top">
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Settings"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
                >
                  <Ico icon={FiSettings} motion="spin" size={16} />
                </Link>
              </Tooltip>
              <Tooltip label="Plan" side="top">
                <Link
                  href="/plans"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Plan"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
                >
                  <Ico icon={FiCreditCard} motion="pop" size={16} />
                </Link>
              </Tooltip>
              <Tooltip label="Help & support" side="top">
                <Link
                  href="/settings/support"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Help & support"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
                >
                  <Ico icon={TbHelpCircle} motion="ring" size={16} />
                </Link>
              </Tooltip>
              <ThemeToggle />
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
                >
                  <FiLogOut size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="btn-grad flex h-9 w-full items-center justify-center rounded-full text-[13px] font-semibold text-white"
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden h-dvh shrink-0 border-r border-line bg-rail transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        {rail}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(288px,88vw)] shadow-xl">{rail}</div>
        </div>
      ) : null}
    </>
  );
}
