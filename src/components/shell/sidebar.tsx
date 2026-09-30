"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiPlus,
  FiSidebar,
  FiX,
  FiUser,
  FiLogOut,
  FiChevronRight,
  FiSettings,
  FiCreditCard,
  FiUsers,
  TbLayoutDashboard,
  TbMessageCircle,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbRobot,
  TbFolder,
  TbHelpCircle,
  TbWorld,
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

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
  teamOnly?: boolean;
}

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "grow" },
  { href: "/agents", label: "Tros", icon: TbRobot, motion: "ring" },
  { href: "/team", label: "Team", icon: FiUsers, motion: "stack", teamOnly: true },
];

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
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

  if (compact) {
    return (
      <Tooltip label={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-9 place-items-center rounded-xl transition-colors",
            active
              ? "bg-accent/15 text-accent"
              : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          <Ico icon={item.icon} motion={item.motion} size={18} />
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
        "group flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-accent/12 text-ink"
          : "text-ink-3 hover:bg-hover hover:text-ink",
      )}
    >
      <Ico
        icon={item.icon}
        motion={item.motion}
        size={17}
        className={active ? "text-accent" : undefined}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  user,
  balance,
  isAdmin = false,
}: {
  user: User | null;
  balance?: Balance | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname() || "/";
  const { collapsed, setCollapsed, open, setOpen, setSettingsOpen } = useNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const showTeam =
    Boolean(user?.teamMember) ||
    Boolean(user?.teamPlanActive) ||
    isAdmin;

  const items = PRIMARY.filter((item) => !item.teamOnly || showTeam);

  const creditsLabel =
    balance && typeof balance.remaining === "number"
      ? `${balance.remaining} credits`
      : user?.email || "";

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <TroveOrb size={26} />
          {!collapsed ? <Wordmark size={18} /> : null}
        </Link>
        <button
          type="button"
          className="ml-auto grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <FiX size={18} />
        </button>
        <button
          type="button"
          className="ml-auto hidden size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink lg:grid"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiSidebar size={16} />
        </button>
      </div>

      <div className="px-3 pb-2">
        <Link
          href="/chat"
          onClick={() => setOpen(false)}
          className={cn(
            "btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold",
            collapsed && "px-0",
          )}
        >
          <FiPlus size={15} />
          {!collapsed ? <span>New chat</span> : null}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
            compact={collapsed}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          {!collapsed ? <ThemeToggle /> : null}
          <Link
            href="/help"
            className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink"
            aria-label="Help"
          >
            <TbHelpCircle size={17} />
          </Link>
        </div>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-hover",
                collapsed && "justify-center",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-[12px] font-semibold text-accent">
                {(user.name || user.email || "?")[0]?.toUpperCase()}
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {user.name || "Account"}
                    </span>
                    <span className="block truncate text-[11px] text-ink-4">
                      {creditsLabel}
                    </span>
                  </span>
                  <FiChevronRight size={14} className="text-ink-4" />
                </>
              ) : null}
            </button>
            {menuOpen ? (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-hover"
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <FiSettings size={14} /> Settings
                </button>
                <Link
                  href="/settings/billing"
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiCreditCard size={14} /> Billing
                </Link>
                <Link
                  href="/settings/account"
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiUser size={14} /> Account
                </Link>
                <form action={logOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-critical hover:bg-hover"
                  >
                    <FiLogOut size={14} /> Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center rounded-xl border border-line px-3 py-2 text-[13px] font-medium text-ink hover:bg-hover"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden h-dvh shrink-0 border-r border-line bg-rail lg:flex lg:flex-col",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        {body}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col border-r border-line bg-rail shadow-[var(--elev-lift)]">
            {body}
          </aside>
        </div>
      ) : null}
    </>
  );
}
