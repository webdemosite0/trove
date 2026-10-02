"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  TroveHomeIcon,
  TroveChatIcon,
  TroveProjectsIcon,
  TroveDocsIcon,
  TroveSheetsIcon,
  TroveDecksIcon,
  TroveDesignIcon,
  TroveSitesIcon,
  TroveTrosIcon,
  TroveArtifactsIcon,
  TroveNewChatIcon,
  TroveSettingsIcon,
  TroveBillingIcon,
  TroveAccountIcon,
  TroveLogoutIcon,
  TroveCloseIcon,
  TroveCollapseIcon,
  TroveHelpIcon,
  TroveChevronRightIcon,
} from "@/components/ui/trove-icons";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { ProductSwitcher, useIsTrosProduct } from "@/components/shell/product-switcher";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import { formatCredits } from "@/lib/format-credits";
import type { User, Balance } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────────────────────
 * Sidebar — full rebuild.
 *
 * Glitch-proofing rules applied throughout (each one fixed a real
 * visual bug):
 * - icons are pointer-events-none so SVG nodes never swallow clicks
 * - every text row is min-w-0 + truncate inside overflow-hidden parents,
 *   so the width transition clips cleanly instead of squishing
 * - collapse state is a stable functional toggle (no stale closures)
 * - mobile drawer locks scroll and closes on Escape
 * ───────────────────────────────────────────────────────────── */

interface Item {
  href: string;
  label: string;
  icon: IconType | React.ComponentType<{ size?: number; className?: string }>;
  motion?: Motion;
}

const TROVE_WORKSPACE: Item[] = [
  { href: "/dashboard", label: "Home", icon: TroveHomeIcon, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TroveChatIcon, motion: "send" },
  { href: "/projects", label: "Projects", icon: TroveProjectsIcon, motion: "stack" },
];

const TROVE_CREATE: Item[] = [
  { href: "/documents", label: "Docs", icon: TroveDocsIcon, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TroveSheetsIcon, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TroveDecksIcon, motion: "launch" },
  { href: "/design", label: "Design", icon: TroveDesignIcon, motion: "hue" },
  { href: "/websites", label: "Sites", icon: TroveSitesIcon, motion: "grow" },
];

const TROS_NAV: Item[] = [
  { href: "/tros", label: "Home", icon: TroveTrosIcon, motion: "sparkle" },
  { href: "/artifacts", label: "Artifacts", icon: TroveArtifactsIcon, motion: "lift" },
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

/** Icons never intercept pointer events — clicks land on the link. */
function NavIcon({ item, active }: { item: Item; active: boolean }) {
  const cls = cn("pointer-events-none shrink-0", active ? "text-ink" : "text-ink-3");
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
  const active = isActive(item, pathname);

  if (compact) {
    return (
      <Tooltip label={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "hover-glow mx-auto grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-colors duration-200",
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
        "hover-glow group flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-[13.5px] transition-colors duration-200",
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
    <p className="truncate px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-4">
      {children}
    </p>
  );
}

function UserMenu({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
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
        className="hover-glow flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-2.5 py-2 transition-colors duration-200 hover:bg-hover"
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
        <TroveChevronRightIcon
          size={18}
          className={cn(
            "pointer-events-none shrink-0 text-ink-3 transition-transform duration-200",
            menuOpen && "rotate-90",
          )}
        />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[210px] overflow-hidden rounded-2xl border border-line bg-raised py-1.5 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.35)]"
        >
          {(
            [
              { label: "Settings", icon: TroveSettingsIcon, section: "general" },
              { label: "Billing", icon: TroveBillingIcon, section: "wallet" },
              { label: "Account", icon: TroveAccountIcon, section: "general" },
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
              <TroveLogoutIcon size={19} className="pointer-events-none shrink-0" />
              <span className="truncate">Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function FooterButton({
  label,
  side = "top",
  onClick,
  href,
  children,
}: {
  label: string;
  side?: "top" | "right";
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
  return (
    <Tooltip label={label} side={side}>
      {btn}
    </Tooltip>
  );
}

export function Sidebar({ user, balance }: { user: User | null; balance?: Balance | null }) {
  const pathname = usePathname() || "/";
  const { open, setOpen, collapsed, toggleCollapsed, openSettings } = useNav();
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

  const isTros = useIsTrosProduct(pathname);

  const renderBody = (c: boolean) => (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
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
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors duration-200 hover:bg-hover hover:text-ink lg:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobile();
          }}
          aria-label="Close menu"
        >
          <TroveCloseIcon size={22} className="pointer-events-none" />
        </button>
        <button
          type="button"
          className="hover-glow hidden size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors duration-200 hover:bg-hover hover:text-ink lg:grid"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCollapsed();
          }}
          aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
          title={c ? "Expand sidebar" : "Collapse sidebar"}
        >
          <TroveCollapseIcon size={22} className="pointer-events-none" />
        </button>
      </div>

      {/* ── New action ─────────────────────────────────────── */}
      <div className="shrink-0 overflow-hidden px-2.5 pb-2">
        {(() => {
          const btn = (
            <Link
              href={isTros ? "/tros?new=1" : "/chat"}
              onClick={closeMobile}
              aria-label={isTros ? "New Tro" : "New chat"}
              className={cn(
                "hover-glow btn-grad flex items-center justify-center gap-2 text-[13.5px] font-semibold transition active:scale-[0.98]",
                c ? "mx-auto size-11 rounded-2xl" : "h-10 w-full rounded-2xl",
              )}
            >
              <TroveNewChatIcon size={21} className="pointer-events-none shrink-0" />
              {!c ? <span className="truncate">New {isTros ? "Tro" : "chat"}</span> : null}
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

      {/* ── Nav ────────────────────────────────────────────── */}
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
            {TROVE_WORKSPACE.map((item) => (
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
            {TROVE_CREATE.map((item) => (
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

      {/* ── Footer ─────────────────────────────────────────── */}
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
                className="hover-glow mx-auto grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors duration-200"
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

        <div className={cn("flex min-w-0 items-center gap-1", c && "flex-col")}>
          {!c ? (
            <>
              <FooterButton
                label="Settings"
                onClick={() => {
                  closeMobile();
                  openSettings("general");
                }}
              >
                <TroveSettingsIcon size={20} />
              </FooterButton>
              <FooterButton label="Plan" href="/plans">
                <Ico icon={TroveBillingIcon} motion="pop" size={20} />
              </FooterButton>
              <FooterButton
                label="Help"
                onClick={() => {
                  closeMobile();
                  openSettings("help");
                }}
              >
                <Ico icon={TroveHelpIcon} motion="ring" size={20} />
              </FooterButton>
              <span className="min-w-0 flex-1" />
              <ThemeToggle />
            </>
          ) : (
            <ThemeToggle />
          )}
        </div>

        {balance && !c ? (
          <div className="flex min-w-0 items-center justify-between overflow-hidden rounded-2xl bg-sunk px-3 py-2 ring-1 ring-line/50">
            <span className="truncate text-[11px] font-medium text-ink-4">Credits</span>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink">
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
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        {renderBody(collapsed)}
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
            {renderBody(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
