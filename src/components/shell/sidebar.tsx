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
            "grid h-9 w-9 place-items-center rounded-lg transition-colors",
            active
              ? "bg-hover text-ink"
              : "text-ink-3 hover:bg-hover hover:text-ink",
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
        active
          ? "rail-item-active bg-hover font-medium text-ink"
          : "text-ink-2 hover:bg-hover hover:text-ink",
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

function UserMenu({
  user,
  isAdmin = false,
  onNavigate,
}: {
  user: User;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-hover"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-3">
            {user.effectivePlan || user.plan} plan
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn("shrink-0 text-ink-3 transition-transform", open && "rotate-90")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full min-w-[200px] overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
          >
            <FiSettings size={14} /> Settings
          </Link>
          <Link
            href="/settings/billing"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
          >
            <FiCreditCard size={14} /> Billing
          </Link>
          <Link
            href="/settings/account"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
          >
            <FiUser size={14} /> Account
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
            >
              <FiSettings size={14} /> Admin
            </Link>
          ) : null}
          <div className="my-1 border-t border-line" />
          <form action={logOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-critical hover:bg-hover"
            >
              <FiLogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
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
  const { collapsed, setCollapsed, open, setOpen } = useNav();
  const closeMobile = () => setOpen(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const showTeam =
    Boolean(user?.teamMember) || Boolean(user?.teamPlanActive) || isAdmin;

  const items = PRIMARY.filter((item) => !item.teamOnly || showTeam);

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-3">
        <Link
          href="/dashboard"
          onClick={closeMobile}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <TroveOrb size={28} />
          {!collapsed ? <Wordmark size={18} /> : null}
        </Link>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink lg:hidden"
          onClick={closeMobile}
          aria-label="Close menu"
        >
          <FiX size={18} />
        </button>
        <button
          type="button"
          className="hidden size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink lg:grid"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiSidebar size={16} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <Link
          href="/chat"
          onClick={closeMobile}
          className={cn(
            "btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white",
            collapsed && "px-0",
          )}
        >
          <FiPlus size={15} />
          {!collapsed ? <span>New chat</span> : null}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={closeMobile}
            compact={collapsed}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-2">
        {!collapsed ? (
          <Link
            href="/refer"
            onClick={closeMobile}
            className="flex items-center gap-2 rounded-xl border border-line bg-sunk/60 px-3 py-2.5 transition hover:bg-hover"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <TbHelpCircle size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-ink">Refer &amp; earn</span>
              <span className="block text-[11px] text-ink-3">Share Trove, get credits</span>
            </span>
          </Link>
        ) : null}

        <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
          {!collapsed ? <ThemeToggle /> : null}
          <Link
            href="/help"
            onClick={closeMobile}
            className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
            aria-label="Help"
          >
            <TbHelpCircle size={17} />
          </Link>
        </div>

        {user ? (
          collapsed ? (
            <Tooltip label={user.name} side="right">
              <Link
                href="/settings"
                onClick={closeMobile}
                className="mx-auto grid size-9 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line"
              >
                {user.name.slice(0, 1).toUpperCase()}
              </Link>
            </Tooltip>
          ) : (
            <UserMenu user={user} isAdmin={isAdmin} onNavigate={closeMobile} />
          )
        ) : (
          <Link
            href="/login"
            onClick={closeMobile}
            className="flex items-center justify-center rounded-xl border border-line px-3 py-2 text-[13px] font-medium text-ink transition hover:bg-hover"
          >
            Sign in
          </Link>
        )}

        {balance && !collapsed ? (
          <p className="px-2 text-[11px] text-ink-4">
            {balance.remaining} credits left
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden h-dvh shrink-0 border-r border-line bg-rail transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[68px]" : "w-[248px]",
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
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col border-r border-line bg-rail shadow-[var(--elev-lift)]">
            {body}
          </aside>
        </div>
      ) : null}
    </>
  );
}
