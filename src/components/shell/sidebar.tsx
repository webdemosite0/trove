"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiX,
  FiUser,
  FiLogOut,
  FiChevronRight,
  FiSettings,
  FiCreditCard,
  FiSidebar,
  TbLayoutDashboard,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbFolder,
  TbHelpCircle,
  TbWorld,
} from "@/components/ui/icons";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import {
  SettingsIcon,
  CirclePlusIcon,
  MessageCircleIcon,
  LayersIcon,
  BotIcon,
} from "@/components/animate-ui/icons";
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
  icon: IconType | React.ComponentType<{ size?: number; className?: string }>;
  motion?: Motion;
  animated?: boolean;
}

const TROVE_NAV: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: MessageCircleIcon, animated: true },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
];

const CREATE_NAV: Item[] = [
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "grow" },
];

const TROS_NAV: Item[] = [
  { href: "/tros", label: "Home", icon: BotIcon, animated: true },
  { href: "/artifacts", label: "Artifacts", icon: LayersIcon, animated: true },
];

function NavIcon({ item, active }: { item: Item; active: boolean }) {
  if (item.animated) {
    const Icon = item.icon as React.ComponentType<{ size?: number; className?: string }>;
    return (
      <Icon
        size={18}
        className={cn("pointer-events-none shrink-0", active ? "text-ink" : "text-ink-3")}
      />
    );
  }
  return (
    <Ico
      icon={item.icon as IconType}
      motion={item.motion}
      size={18}
      active={active}
      className={cn("pointer-events-none shrink-0", active ? "text-ink" : "text-ink-3")}
    />
  );
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
          aria-label={item.label}
          className={cn(
            "mx-auto grid h-10 w-10 place-items-center rounded-2xl transition-colors",
            active
              ? "bg-hover text-ink ring-1 ring-line-strong"
              : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          <NavIcon item={item} active={active} />
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
        "group flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-[13.5px] transition-colors",
        active
          ? "bg-hover font-medium text-ink ring-1 ring-line-strong"
          : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <NavIcon item={item} active={active} />
      <span className="min-w-0 flex-1 truncate tracking-[-0.01em]">{item.label}</span>
      {active ? (
        <span aria-hidden className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" />
      ) : null}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-4">
      {children}
    </p>
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
        className="group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-2.5 py-2 transition-colors hover:bg-hover"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-[13px] font-semibold text-ink ring-1 ring-line">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13.5px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-3">
            {user.effectivePlan || user.plan} plan
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn("shrink-0 text-ink-3 transition-transform", menuOpen && "rotate-90")}
        />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[210px] overflow-hidden rounded-2xl border border-line bg-raised py-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onNavigate?.();
              openSettings("general");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
          >
            <FiSettings size={15} /> Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onNavigate?.();
              openSettings("wallet");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
          >
            <FiCreditCard size={15} /> Billing
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onNavigate?.();
              openSettings("general");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
          >
            <FiUser size={15} /> Account
          </button>
          <div className="my-1.5 border-t border-line" />
          <form action={logOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-critical hover:bg-hover"
            >
              <FiLogOut size={15} /> Sign out
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
  const { open, setOpen, collapsed, toggleCollapsed, openSettings } = useNav();
  const closeMobile = () => setOpen(false);
  const isTros = useIsTrosProduct(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const renderBody = (c: boolean) => (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 overflow-hidden px-2.5",
          c ? "flex-col gap-2 py-3" : "h-14",
        )}
      >
        <div className={cn("min-w-0", c ? "" : "flex-1")}>
          <ProductSwitcher collapsed={c} onNavigate={closeMobile} />
        </div>
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink lg:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobile();
          }}
          aria-label="Close menu"
        >
          <FiX size={18} />
        </button>
        <button
          type="button"
          className="hidden size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink lg:grid"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCollapsed();
          }}
          aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
          title={c ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiSidebar size={17} />
        </button>
      </div>

      {/* New action */}
      <div className="shrink-0 overflow-hidden px-2.5 pb-2">
        {(() => {
          const btn = (
            <Link
              href={isTros ? "/tros?new=1" : "/chat"}
              onClick={closeMobile}
              aria-label={isTros ? "New Tro" : "New chat"}
              className={cn(
                "btn-grad flex items-center justify-center gap-2 text-[13.5px] font-semibold transition active:scale-[0.98]",
                c ? "mx-auto size-11 rounded-2xl" : "h-10 w-full rounded-2xl",
              )}
            >
              <CirclePlusIcon size={17} className="pointer-events-none" />
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

      {/* Nav */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-3">
        {isTros ? (
          <>
            {!c ? <SectionLabel>Tros</SectionLabel> : <div className="h-2" />}
            {TROS_NAV.map((item) => (
              <NavRow
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                onNavigate={closeMobile}
                compact={c}
              />
            ))}
          </>
        ) : (
          <>
            {!c ? <SectionLabel>Workspace</SectionLabel> : <div className="h-2" />}
            {TROVE_NAV.map((item) => (
              <NavRow
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                onNavigate={closeMobile}
                compact={c}
              />
            ))}
            {!c ? (
              <SectionLabel>Create</SectionLabel>
            ) : (
              <div className="mx-2 my-2 border-t border-line" />
            )}
            {CREATE_NAV.map((item) => (
              <NavRow
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                onNavigate={closeMobile}
                compact={c}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="relative z-10 shrink-0 space-y-2 overflow-hidden border-t border-line bg-rail p-2.5">
        {user ? (
          c ? (
            <Tooltip label={user.name} side="right">
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  openSettings("general");
                }}
                aria-label="Open settings"
                className="mx-auto grid size-10 place-items-center rounded-2xl bg-accent/15 text-[13px] font-semibold text-ink ring-1 ring-line"
              >
                {user.name.slice(0, 1).toUpperCase()}
              </button>
            </Tooltip>
          ) : (
            <UserMenu user={user} onNavigate={closeMobile} />
          )
        ) : (
          <Link
            href="/login"
            onClick={closeMobile}
            className="btn-grad flex h-10 w-full items-center justify-center rounded-2xl text-[13.5px] font-semibold"
          >
            Log in
          </Link>
        )}

        <div className={cn("flex items-center gap-1", c && "flex-col")}>
          {!c ? (
            <>
              <Tooltip label="Settings" side="top">
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    openSettings("general");
                  }}
                  aria-label="Settings"
                  className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                >
                  <SettingsIcon size={16} className="pointer-events-none" />
                </button>
              </Tooltip>
              <Tooltip label="Plan" side="top">
                <Link
                  href="/plans"
                  onClick={closeMobile}
                  aria-label="Plan"
                  className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                >
                  <Ico icon={FiCreditCard} motion="pop" size={16} />
                </Link>
              </Tooltip>
              <Tooltip label="Help" side="top">
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    openSettings("help");
                  }}
                  aria-label="Help & support"
                  className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                >
                  <Ico icon={TbHelpCircle} motion="ring" size={16} />
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
          <div className="flex items-center justify-between rounded-2xl bg-sunk px-3 py-2 ring-1 ring-line/50">
            <span className="text-[11px] font-medium text-ink-4">Credits</span>
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
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-300 ease-out lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-[256px]",
        )}
      >
        {renderBody(collapsed)}
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={(e) => {
              e.preventDefault();
              closeMobile();
            }}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col overflow-hidden rounded-r-3xl border-r border-line bg-rail shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderBody(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
