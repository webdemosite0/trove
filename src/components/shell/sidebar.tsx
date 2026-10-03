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
import {
  SettingsIcon,
  CirclePlusIcon,
  MessageCircleIcon,
  LayersIcon,
  BotIcon,
} from "@/components/animate-ui/icons";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { ProductSwitcher, useIsTrosProduct } from "@/components/shell/product-switcher";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import { formatCredits } from "@/lib/format-credits";
import type { User, Balance } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip";
import { SidebarTroList } from "@/components/shell/sidebar-tro-list";

/* ─────────────────────────────────────────────────────────────
 * Sidebar — single unified component.
 *
 * There is exactly one sidebar body. It renders inside the desktop
 * <aside> and inside the mobile drawer. Collapse is a pure CSS
 * animation driven by one boolean (`rail`):
 *
 * - RailLabel is the only collapse primitive: text shrinks to zero
 *   width and fades. Nothing ever unmounts on toggle.
 * - On expand, labels fade in with a 150ms delay so the width opens
 *   first. On collapse they vanish immediately so the width closes clean.
 * - Icons are pointer-events-none so SVG nodes never swallow clicks.
 * ───────────────────────────────────────────────────────────── */

interface Item {
  href: string;
  label: string;
  icon: IconType | React.ComponentType<{ size?: number; className?: string }>;
  motion?: Motion;
  animated?: boolean;
}

const TROVE_WORKSPACE: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: MessageCircleIcon, animated: true },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
];

const TROVE_CREATE: Item[] = [
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

function isActive(item: Item, pathname: string): boolean {
  const hrefPath = item.href.split("?")[0] || item.href;
  if (pathname === hrefPath) return true;
  if (
    hrefPath === "/tros" &&
    (pathname === "/tros" || pathname.startsWith("/tros/")) &&
    !item.href.includes("new=1")
  )
    return true;
  if (
    hrefPath !== "/dashboard" &&
    hrefPath !== "/tros" &&
    pathname.startsWith(hrefPath + "/")
  )
    return true;
  return false;
}

/** The single collapse primitive: label shrinks to zero width and fades. */
function RailLabel({
  rail,
  max = "max-w-[180px]",
  className,
  children,
}: {
  rail: boolean;
  max?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden={rail}
      className={cn(
        "min-w-0 truncate whitespace-nowrap transition-all duration-200",
        rail ? "max-w-0 opacity-0" : cn(max, "opacity-100 delay-150"),
        className,
      )}
    >
      {children}
    </span>
  );
}

function NavIcon({ item, active }: { item: Item; active: boolean }) {
  const cls = cn("pointer-events-none shrink-0", active ? "text-ink" : "text-ink-3");
  if (item.animated) {
    const Icon = item.icon as React.ComponentType<{ size?: number; className?: string }>;
    return <Icon size={21} className={cls} />;
  }
  return (
    <Ico
      icon={item.icon as IconType}
      motion={item.motion}
      size={21}
      active={active}
      className={cls}
    />
  );
}

function NavItem({
  item,
  pathname,
  rail,
  onNavigate,
}: {
  item: Item;
  pathname: string;
  rail: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(item, pathname);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={rail ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "hover-glow flex min-w-0 items-center overflow-hidden rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        rail ? "mx-auto size-10 shrink-0 justify-center" : "w-full gap-3 px-3 py-2.5 text-[13.5px]",
        active
          ? "bg-hover font-medium text-ink ring-1 ring-line-strong"
          : "text-ink-3 hover:bg-hover hover:text-ink",
        !rail && !active && "text-ink-2",
      )}
    >
      <NavIcon item={item} active={active} />
      <RailLabel rail={rail} className="flex-1 tracking-[-0.01em]">
        {item.label}
      </RailLabel>
      {active ? (
        <span
          aria-hidden
          className={cn(
            "ml-auto size-1.5 shrink-0 rounded-full bg-accent transition-all duration-200",
            rail ? "w-0 opacity-0" : "opacity-100 delay-150",
          )}
        />
      ) : null}
    </Link>
  );
  return rail ? (
    <Tooltip label={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function SectionTitle({ rail, children }: { rail: boolean; children: React.ReactNode }) {
  return (
    <p
      aria-hidden={rail}
      className={cn(
        "overflow-hidden whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-4 transition-all duration-200",
        rail ? "max-h-0 pb-0 pt-0 opacity-0" : "max-h-10 pb-2 pt-4 opacity-100 delay-150",
      )}
    >
      {children}
    </p>
  );
}

function UserMenu({
  user,
  rail,
  onNavigate,
}: {
  user: User;
  rail: boolean;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const go = (section: string) => {
    setMenuOpen(false);
    onNavigate?.();
    openSettings(section);
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={rail ? user.name : undefined}
        className={cn(
          "hover-glow flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl transition-all duration-300 hover:bg-hover",
          rail ? "mx-auto size-10 justify-center px-0 py-0" : "w-full px-2.5 py-2",
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-[13px] font-semibold text-ink ring-1 ring-line">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <RailLabel rail={rail} className="block text-[13.5px] font-medium text-ink">
            {user.name}
          </RailLabel>
          <RailLabel rail={rail} className="block text-[11px] capitalize text-ink-3">
            {user.effectivePlan || user.plan} plan
          </RailLabel>
        </span>
        {!rail ? (
          <FiChevronRight
            size={18}
            className={cn(
              "pointer-events-none shrink-0 text-ink-3 transition-transform duration-200",
              menuOpen && "rotate-90",
            )}
          />
        ) : null}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[210px] overflow-hidden rounded-2xl border border-line bg-raised py-1.5 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.35)]"
        >
          {(
            [
              { label: "Settings", icon: FiSettings, section: "general" },
              { label: "Billing", icon: FiCreditCard, section: "wallet" },
              { label: "Account", icon: FiUser, section: "general" },
            ] as const
          ).map((m) => (
            <button
              key={m.label}
              type="button"
              role="menuitem"
              onClick={() => go(m.section)}
              className="flex w-full min-w-0 items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <m.icon size={19} className="pointer-events-none shrink-0" />
              <span className="truncate">{m.label}</span>
            </button>
          ))}
          <div className="my-1.5 border-t border-line" />
          <form action={logOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full min-w-0 items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-critical transition-colors hover:bg-hover"
            >
              <FiLogOut size={19} className="pointer-events-none shrink-0" />
              <span className="truncate">Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function FooterIconButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const cls =
    "hover-glow grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors duration-200 hover:bg-hover hover:text-ink";
  const inner = <span className="pointer-events-none contents">{children}</span>;
  const btn = onClick ? (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {inner}
    </button>
  ) : (
    <Link href={href!} aria-label={label} className={cls}>
      {inner}
    </Link>
  );
  return <Tooltip label={label}>{btn}</Tooltip>;
}

/* ── The one sidebar body. Desktop rail and mobile drawer both render this. ── */
function SidebarBody({
  user,
  balance,
  rail,
  isMobile,
}: {
  user: User | null;
  balance?: Balance | null;
  rail: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname() || "/";
  const { toggleCollapsed, openSettings, setOpen } = useNav();
  const closeMobile = () => setOpen(false);
  const isTros = useIsTrosProduct(pathname);
  const newHref = isTros ? "/tros?new=1" : "/chat";
  const newLabel = isTros ? "New Tro" : "New chat";

  const newBtn = (
    <Link
      href={newHref}
      onClick={closeMobile}
      aria-label={newLabel}
      className={cn(
        "hover-glow btn-grad flex items-center justify-center gap-2 overflow-hidden text-[13.5px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
        rail ? "mx-auto size-11 rounded-2xl" : "h-10 w-full rounded-2xl",
      )}
    >
      <CirclePlusIcon size={21} className="pointer-events-none shrink-0" />
      <RailLabel rail={rail} max="max-w-[120px]">
        {newLabel}
      </RailLabel>
    </Link>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 overflow-hidden px-2.5 transition-all duration-300",
          rail ? "flex-col gap-2 py-3" : "h-14",
        )}
      >
        <div className={cn("min-w-0", !rail && "flex-1")}>
          <ProductSwitcher collapsed={rail} onNavigate={closeMobile} />
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors duration-200 hover:bg-hover hover:text-ink"
          >
            <FiX size={22} className="pointer-events-none" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCollapsed();
            }}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            title={rail ? "Expand sidebar" : "Collapse sidebar"}
            className="hover-glow grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors duration-200 hover:bg-hover hover:text-ink"
          >
            <FiSidebar size={22} className="pointer-events-none" />
          </button>
        )}
      </div>

      {/* New action */}
      <div className="shrink-0 overflow-hidden px-2.5 pb-2">
        {rail ? (
          <Tooltip label={newLabel} side="right">
            {newBtn}
          </Tooltip>
        ) : (
          newBtn
        )}
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-3">
        {isTros ? (
          <>
            {/* Tros product: the Tros themselves are the hero — not a nav list.
                Distinct from the Trove sidebar's Workspace/Create structure. */}
            <div className="px-1">
              <SidebarTroList rail={rail} />
            </div>
            <div className="mt-3 border-t border-line/60 pt-2">
              {TROS_NAV.map((item) => (
                <NavItem
                  key={item.href + item.label}
                  item={item}
                  pathname={pathname}
                  rail={rail}
                  onNavigate={closeMobile}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionTitle rail={rail}>Workspace</SectionTitle>
            {TROVE_WORKSPACE.map((item) => (
              <NavItem
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                rail={rail}
                onNavigate={closeMobile}
              />
            ))}
            <SectionTitle rail={rail}>Create</SectionTitle>
            {TROVE_CREATE.map((item) => (
              <NavItem
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                rail={rail}
                onNavigate={closeMobile}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="relative z-10 shrink-0 space-y-2 overflow-hidden border-t border-line bg-rail p-2.5">
        {user ? (
          <UserMenu user={user} rail={rail} onNavigate={closeMobile} />
        ) : (
          <Link
            href="/login"
            onClick={closeMobile}
            className="btn-grad flex h-10 w-full items-center justify-center rounded-2xl text-[13.5px] font-semibold"
          >
            Log in
          </Link>
        )}

        <div
          className={cn(
            "flex min-w-0 items-center transition-all duration-300",
            rail ? "gap-0" : "gap-1",
          )}
        >
          {(
            [
              {
                key: "settings",
                btn: (
                  <FooterIconButton
                    label="Settings"
                    onClick={() => {
                      closeMobile();
                      openSettings("general");
                    }}
                  >
                    <SettingsIcon size={20} />
                  </FooterIconButton>
                ),
              },
              {
                key: "plan",
                btn: (
                  <FooterIconButton label="Plan" href="/plans">
                    <Ico icon={FiCreditCard} motion="pop" size={20} />
                  </FooterIconButton>
                ),
              },
              {
                key: "help",
                btn: (
                  <FooterIconButton
                    label="Help"
                    onClick={() => {
                      closeMobile();
                      openSettings("help");
                    }}
                  >
                    <Ico icon={TbHelpCircle} motion="ring" size={20} />
                  </FooterIconButton>
                ),
              },
            ] as const
          ).map((b) => (
            <span
              key={b.key}
              aria-hidden={rail}
              className={cn(
                "overflow-hidden transition-all duration-200",
                rail ? "max-w-0 opacity-0" : "max-w-[40px] opacity-100 delay-150",
              )}
            >
              {b.btn}
            </span>
          ))}
          <span className="min-w-0 flex-1" />
          <ThemeToggle />
        </div>

        {balance ? (
          <div
            aria-hidden={rail}
            className={cn(
              "overflow-hidden transition-all duration-200",
              rail ? "max-h-0 opacity-0" : "max-h-12 opacity-100 delay-150",
            )}
          >
            <div className="flex min-w-0 items-center justify-between whitespace-nowrap rounded-2xl bg-sunk px-3 py-2 ring-1 ring-line/50">
              <span className="truncate text-[11px] font-medium text-ink-4">Credits</span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink">
                {formatCredits(Number(balance.remaining))}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Sidebar({ user, balance }: { user: User | null; balance?: Balance | null }) {
  const pathname = usePathname() || "/";
  const { open, setOpen, collapsed } = useNav();
  const closeMobile = () => setOpen(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Mobile drawer: Escape closes, background scroll locks.
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

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <SidebarBody user={user} balance={balance} rail={collapsed} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col overflow-hidden rounded-r-[24px] border-r border-line bg-rail shadow-[0_24px_64px_-16px_rgb(0_0_0/0.4)]">
            <SidebarBody user={user} balance={balance} rail={false} isMobile />
          </aside>
        </div>
      ) : null}
    </>
  );
}