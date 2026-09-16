"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiX,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiSettings,
  FiCreditCard,
  TbUsers,
  TbRobot,
  TbWorld,
  TbHome,
  TbFileText,
  TbTable,
  TbPresentation,
  TbSearch,
  TbMessageCircle,
  TbFolder,
  TbLayoutGrid,
  TbFiles,
  TbTemplate,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";
import type { Balance } from "@/lib/credits";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
}

/** Exact order from product screenshot */
const NAV: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "tilt" },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "pop" },
  { href: "/projects", label: "Files", icon: TbFiles, motion: "lift" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "spin" },
  { href: "/documents", label: "Docs", icon: TbFileText, motion: "lift" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "grow" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "pop" },
  { href: "/research", label: "Research", icon: TbSearch, motion: "scan" },
  { href: "/team", label: "Team", icon: TbUsers, motion: "tilt" },
  { href: "/skills", label: "Templates", icon: TbTemplate, motion: "open" },
];

function isActive(pathname: string, href: string, label?: string) {
  if (label === "Files") return false;
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: Item;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href, item.label);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-[9px] text-[14px] font-medium transition-colors",
        active
          ? "bg-[#ebe8ff] text-[#5b4cdb]"
          : "text-[#5c5c6e] hover:bg-[#f4f3f8] hover:text-[#1a1a24]",
      )}
    >
      <item.icon
        size={18}
        strokeWidth={1.75}
        className={cn("shrink-0", active ? "text-[#5b4cdb]" : "text-[#8b8b9a]")}
      />
      <span className="truncate">{item.label}</span>
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
        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[#f4f3f8]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ebe8ff] text-[12px] font-semibold text-[#5b4cdb]">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-medium text-[#1a1a24]">
            {user.name}
          </span>
          <span className="block truncate text-[11px] capitalize text-[#8b8b9a]">
            {user.plan} Plan
          </span>
        </span>
        <FiChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[#8b8b9a] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-xl border border-[#e8e7ef] bg-white shadow-lg"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#5c5c6e] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
          >
            <FiSettings size={15} className="text-[#8b8b9a]" />
            Settings
          </Link>
          <Link
            href="/plans"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#5c5c6e] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
          >
            <FiCreditCard size={15} className="text-[#8b8b9a]" />
            Plan & credits
          </Link>
          <form action={logOut} className="border-t border-[#e8e7ef]">
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-[#5c5c6e] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
            >
              <FiLogOut size={15} className="text-[#8b8b9a]" />
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
  onNavigate,
}: {
  user: User | null;
  balance: Balance | null;
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center px-4 pt-4 pb-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Trove home"
          className="inline-flex items-center gap-2.5"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a1a24] text-[13px] font-bold text-white">
            T
          </span>
          <span className="text-[16px] font-semibold tracking-tight text-[#1a1a24]">
            Trove
          </span>
        </Link>
      </div>

      {/* Nav list */}
      <nav
        aria-label="Main"
        className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3 scrollbar-none"
      >
        {NAV.map((it) => (
          <NavRow
            key={`${it.label}-${it.href}`}
            item={it}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-2.5 border-t border-[#efeeef] p-3">
        <Link
          href="/plans"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl bg-[#f3f0ff] px-3 py-2.5 transition hover:bg-[#ebe8ff]"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ebe8ff] text-[14px]">
            👑
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#5b4cdb]">
              Upgrade
            </span>
            <span className="block text-[11px] leading-snug text-[#7c6fff]/80">
              More power, more possibilities.
            </span>
          </span>
          <span className="text-[#7c6fff]">→</span>
        </Link>

        {user ? (
          <UserMenu user={user} onNavigate={onNavigate} />
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13.5px] text-[#1a1a24] transition-colors hover:bg-[#f4f3f8]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f4f3f8] text-[#8b8b9a]">
              <Ico icon={FiUser} motion="tilt" size={14} />
            </span>
            Log in
          </Link>
        )}
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
          "nx-no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#efeeef] bg-white lg:flex",
          "transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "w-[220px]" : "w-[64px]",
          collapsed && peek && "z-40 shadow-lg",
        )}
      >
        {expanded ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <RailBody user={user} balance={balance} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-1 py-4">
            <Link href="/dashboard" aria-label="Trove home" className="mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a1a24] text-[13px] font-bold text-white">
                T
              </span>
            </Link>
            <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto scrollbar-none">
              {NAV.map((i) => {
                const active = isActive(pathname, i.href, i.label);
                return (
                  <Link
                    key={`${i.label}-c`}
                    href={i.href}
                    title={i.label}
                    aria-label={i.label}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                      active
                        ? "bg-[#ebe8ff] text-[#5b4cdb]"
                        : "text-[#8b8b9a] hover:bg-[#f4f3f8] hover:text-[#1a1a24]",
                    )}
                  >
                    <i.icon size={18} strokeWidth={1.75} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-[#efeeef] bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-[#8b8b9a] transition-colors hover:bg-[#f4f3f8]"
            >
              <FiX size={17} />
            </button>
            <RailBody user={user} balance={balance} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "nx-no-print hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
          collapsed ? "w-[64px]" : "w-[220px]",
        )}
      />
    </>
  );
}
