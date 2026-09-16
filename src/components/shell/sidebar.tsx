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
  TbBell,
  TbUsers,
  TbRobot,
  TbWorld,
  TbHome,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbSearch,
  TbMessageCircle,
  TbPlugConnected,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";
import type { Balance } from "@/lib/credits";
import { CreditMeter } from "@/components/shell/credit-meter";
import { Tooltip } from "@/components/ui/tooltip";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
}

/** Flat primary nav — Lovable-style: short labels, one list, no noisy groups */
const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "spin" },
  { href: "/documents", label: "Docs", icon: TbFileText, motion: "lift" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "pop" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "grow" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "tilt" },
  { href: "/research", label: "Research", icon: TbSearch, motion: "scan" },
  { href: "/team", label: "Team", icon: TbUsers, motion: "tilt" },
];

const MORE: Item[] = [
  { href: "/integrations", label: "Apps", icon: TbPlugConnected, motion: "open" },
  { href: "/reminders", label: "Alerts", icon: TbBell, motion: "ring" },
];

function isActive(pathname: string, href: string) {
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
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-accent-soft text-accent"
          : "text-ink-2 hover:bg-hover hover:text-ink",
        compact && "justify-center px-0",
      )}
    >
      <Ico
        icon={item.icon}
        motion={item.motion}
        active={active}
        size={18}
        className="shrink-0"
      />
      {!compact ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

function UserMenu({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-hover"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink-2 ring-1 ring-line">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-4">
            {user.plan} plan
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn(
            "shrink-0 text-ink-4 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-xl border border-line bg-raised shadow-lg"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiSettings size={15} className="text-ink-4" />
            Settings
          </Link>
          <Link
            href="/plans"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiCreditCard size={15} className="text-ink-4" />
            Plan & credits
          </Link>
          <form action={logOut} className="border-t border-line">
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiLogOut size={15} className="text-ink-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function RailBody({
  user,
  balance,
  onNavigate,
  onCollapse,
}: {
  user: User | null;
  balance: Balance | null;
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Header — logo + collapse */}
      <div className="flex items-center justify-between px-3 pt-3.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Trove home"
          className="inline-flex items-center gap-2"
        >
          <TroveOrb size={26} state="idle" />
          <Wordmark size={15} sweep={false} />
        </Link>
        {onCollapse ? (
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            title="Toggle sidebar  ⌘B"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiSidebar} motion="nudge" size={17} />
          </button>
        ) : null}
      </div>

      {/* Primary CTA */}
      <div className="px-3 pt-3">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <FiPlus size={16} />
          New chat
        </Link>
      </div>

      {/* Main nav — single clean list */}
      <nav
        aria-label="Main"
        className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-2 scrollbar-none"
      >
        {PRIMARY.map((it) => (
          <NavRow key={it.href} item={it} pathname={pathname} onNavigate={onNavigate} />
        ))}

        <div className="my-3 border-t border-line" />

        {MORE.map((it) => (
          <NavRow key={it.href} item={it} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Footer — credits + user */}
      <div className="space-y-2 border-t border-line p-2.5">
        <CreditMeter balance={balance} />

        {user ? (
          <UserMenu user={user} onNavigate={onNavigate} />
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13.5px] text-ink transition-colors hover:bg-hover"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-ink-3">
              <Ico icon={FiUser} motion="tilt" size={14} />
            </span>
            Log in
          </Link>
        )}

        <div className="flex items-center gap-1 pt-1">
          <Tooltip label="Settings" side="top">
            <Link
              href="/settings"
              onClick={onNavigate}
              aria-label="Settings"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-4 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiSettings size={16} />
            </Link>
          </Tooltip>
          <Tooltip label="Plan" side="top">
            <Link
              href="/plans"
              onClick={onNavigate}
              aria-label="Plan"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-4 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiCreditCard size={16} />
            </Link>
          </Tooltip>
          <span className="flex-1" />
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  user,
  balance,
}: {
  user: User | null;
  balance: Balance | null;
  isAdmin?: boolean;
}) {
  const { open, setOpen, collapsed, setCollapsed } = useNav();
  const pathname = usePathname();
  const [peek, setPeek] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = !collapsed || peek;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setPeek(false);
        setCollapsed(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, setCollapsed]);

  useEffect(() => {
    if (!collapsed) setPeek(false);
  }, [collapsed]);

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  function onRailEnter() {
    if (!collapsed) return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setPeek(true);
  }

  function onRailLeave() {
    if (!collapsed) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setPeek(false), 160);
  }

  return (
    <>
      <aside
        onMouseEnter={onRailEnter}
        onMouseLeave={onRailLeave}
        className={cn(
          "nx-no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail lg:flex",
          "transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "w-[240px]" : "w-[64px]",
          collapsed && peek && "z-40 shadow-lg",
        )}
      >
        {expanded ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <RailBody
              user={user}
              balance={balance}
              onCollapse={() => {
                setPeek(false);
                setCollapsed(true);
              }}
            />
          </div>
        ) : (
          /* Collapsed icon rail */
          <div className="flex h-full flex-col items-center gap-1 py-3">
            <Link href="/dashboard" aria-label="Trove home" className="mb-1">
              <TroveOrb size={28} state="idle" />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              title="Toggle sidebar  ⌘B"
              className="mb-2 grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiSidebar} motion="nudge" size={17} />
            </button>

            <Link
              href="/chat"
              title="New chat"
              aria-label="New chat"
              className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-ink text-white"
            >
              <FiPlus size={16} />
            </Link>

            <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto scrollbar-none">
              {PRIMARY.map((i) => (
                <NavRow
                  key={i.href}
                  item={i}
                  pathname={pathname}
                  compact
                />
              ))}
            </div>

            <div className="mt-auto pt-2">
              <CreditMeter balance={balance} collapsed />
            </div>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-rail shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiX size={17} />
            </button>
            <RailBody user={user} balance={balance} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Spacer so content doesn't sit under fixed rail */}
      <div
        className={cn(
          "nx-no-print hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      />
    </>
  );
}
