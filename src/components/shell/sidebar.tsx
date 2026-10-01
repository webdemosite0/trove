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
  FiLayers,
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
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { ProductSwitcher, useIsTrosProduct } from "@/components/shell/product-switcher";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import { formatCredits } from "@/lib/format-credits";
import type { User, Balance } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
}

const TROVE_NAV: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "grow" },
];

const TROS_NAV: Item[] = [
  { href: "/tros", label: "Home", icon: TbRobot, motion: "ring" },
  { href: "/tros?new=1", label: "New Tro", icon: FiPlus, motion: "open" },
  { href: "/artifacts", label: "Artifacts", icon: FiLayers, motion: "scan" },
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
  const hrefPath = item.href.split("?")[0] || item.href;
  const active =
    pathname === hrefPath ||
    (hrefPath !== "/dashboard" &&
      hrefPath !== "/tros" &&
      pathname.startsWith(hrefPath + "/")) ||
    (hrefPath === "/tros" &&
      (pathname === "/tros" || pathname.startsWith("/tros/")) &&
      !item.href.includes("new=1"));

  if (compact) {
    return (
      <Tooltip label={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "mx-auto grid h-9 w-9 place-items-center rounded-xl transition-colors",
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
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors",
        active
          ? "rail-item-active bg-hover font-medium text-ink"
          : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent"
        />
      ) : null}
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
  onNavigate,
}: {
  user: User;
  onNavigate?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openSettings } = useNav();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
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
        <FiChevronRight size={14} className={cn("shrink-0 text-ink-3 transition-transform", menuOpen && "rotate-90")} />
      </button>
      {menuOpen ? (
        <div role="menu" className="absolute bottom-full left-0 z-50 mb-1.5 w-full min-w-[200px] overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]">
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onNavigate?.(); openSettings("general"); }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover">
            <FiSettings size={14} /> Settings
          </button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onNavigate?.(); openSettings("wallet"); }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover">
            <FiCreditCard size={14} /> Billing
          </button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onNavigate?.(); openSettings("general"); }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover">
            <FiUser size={14} /> Account
          </button>
          <div className="my-1 border-t border-line" />
          <form action={logOut}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-critical hover:bg-hover">
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
}: {
  user: User | null;
  balance?: Balance | null;
}) {
  const pathname = usePathname() || "/";
  const { open, setOpen, collapsed, setCollapsed, openSettings } = useNav();
  const closeMobile = () => setOpen(false);
  useEffect(() => { setOpen(false); }, [pathname, setOpen]);
  const isTros = useIsTrosProduct(pathname);
  const items = isTros ? TROS_NAV : TROVE_NAV;
  const renderBody = (c: boolean) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex shrink-0 gap-1.5 px-2.5", c ? "flex-col items-center py-3" : "h-14 flex-row items-center")}>
        <ProductSwitcher collapsed={c} onNavigate={closeMobile} />
        <button type="button" className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink lg:hidden" onClick={closeMobile} aria-label="Close menu">
          <FiX size={18} />
        </button>
        <button type="button" className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink max-lg:hidden" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Ico icon={FiSidebar} motion="panel" size={16} />
        </button>
      </div>
      <div className="shrink-0 px-3 pb-3">
        {(() => {
          const btn = (
            <Link
              href={isTros ? "/tros?new=1" : "/chat"}
              onClick={closeMobile}
              aria-label={isTros ? "New Tro" : "New chat"}
              className={cn(
                "btn-grad flex items-center justify-center gap-1.5 text-[13px] font-semibold",
                c ? "mx-auto size-10 rounded-full" : "h-9 w-full rounded-full",
              )}
            >
              <FiPlus size={16} />
              {!c ? <span>{isTros ? "New Tro" : "New chat"}</span> : null}
            </Link>
          );
          return c ? (
            <Tooltip label={isTros ? "New Tro" : "New chat"} side="right">
              {btn}
            </Tooltip>
          ) : (
            btn
          );
        })()}
      </div>
      {!c ? (
        <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
          {isTros ? "Tros" : "Workspace"}
        </p>
      ) : null}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 pb-2">
        {items.map((item) => (
          <NavRow key={item.href + item.label} item={item} pathname={pathname} onNavigate={closeMobile} compact={c} />
        ))}
      </nav>
      <div className="relative z-10 shrink-0 space-y-2 border-t border-line bg-rail p-2.5">
        {user ? (
          c ? (
            <Tooltip label={user.name} side="right">
              <button type="button" onClick={() => { closeMobile(); openSettings("general"); }} aria-label="Open settings" className="mx-auto grid size-9 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line">
                {user.name.slice(0, 1).toUpperCase()}
              </button>
            </Tooltip>
          ) : (
            <UserMenu user={user} onNavigate={closeMobile} />
          )
        ) : (
          <Link href="/login" onClick={closeMobile} className="btn-grad flex h-9 w-full items-center justify-center rounded-full text-[13px] font-semibold">
            Log in
          </Link>
        )}
        <div className={cn("flex items-center gap-1 pt-1", c && "justify-center")}>
          {!c ? (
            <>
              <Tooltip label="Settings" side="top">
                <button type="button" onClick={() => { closeMobile(); openSettings("general"); }} aria-label="Settings" className="grid h-8 w-8 place-items-center rounded-xl text-ink transition-colors hover:bg-hover">
                  <Ico icon={FiSettings} motion="spin" size={16} className="text-ink" />
                </button>
              </Tooltip>
              <Tooltip label="Plan" side="top">
                <Link href="/plans" onClick={closeMobile} aria-label="Plan" className="grid h-8 w-8 place-items-center rounded-xl text-ink transition-colors hover:bg-hover">
                  <Ico icon={FiCreditCard} motion="pop" size={16} className="text-ink" />
                </Link>
              </Tooltip>
              <Tooltip label="Help" side="top">
                <button type="button" onClick={() => { closeMobile(); openSettings("help"); }} aria-label="Help & support" className="grid h-8 w-8 place-items-center rounded-xl text-ink transition-colors hover:bg-hover">
                  <Ico icon={TbHelpCircle} motion="ring" size={16} className="text-ink" />
                </button>
              </Tooltip>
              <span className="flex-1" />
              <ThemeToggle />
            </>
          ) : (
            <ThemeToggle />
          )}
        </div>
        {balance && !c ? (
          <div className="mx-0.5 flex items-center justify-between rounded-xl bg-sunk px-2.5 py-1.5">
            <span className="text-[11px] text-ink-4">Credits</span>
            <span className="text-[11px] font-semibold tabular-nums text-ink">
              {formatCredits(Number(balance.remaining))}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        {renderBody(collapsed)}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col overflow-hidden rounded-r-3xl border-r border-line bg-rail shadow-[var(--elev-lift)]">
            {renderBody(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
