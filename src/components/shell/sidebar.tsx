"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiPlus,
  FiX,
  FiSidebar,
  FiSettings,
  FiCreditCard,
  FiUser,
  FiLogOut,
  FiChevronRight,
  FiLayers,
  TbLayoutDashboard,
  TbMessageCircle,
  TbFolder,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
 
  TbRobot,
  TbUsers,
  TbHelpCircle,
} from "@/components/ui/icons";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ProductSwitcher, useIsTrosProduct } from "@/components/shell/product-switcher";
import { ThemeToggle } from "@/components/shell/theme";
import { Tooltip } from "@/components/ui/tooltip";
import { formatCredits } from "@/lib/format-credits";
import { useIsDesktopClient } from "@/lib/is-desktop-client";
import { userHasTrosAccess } from "@/lib/tros-access";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";

type IconComp = ComponentType<{ size?: number; className?: string }>;

type NavItem = {
  href: string;
  label: string;
  icon: IconComp;
};

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard },
  { href: "/chat", label: "Chat", icon: TbMessageCircle },
  { href: "/projects", label: "Projects", icon: TbFolder },
];

const TEAM_NAV: NavItem = { href: "/team", label: "Team", icon: TbUsers };

function isTeamPlan(user: User | null): boolean {
  if (!user) return false;
  if (user.teamPlanActive) return true;
  const p = (user.effectivePlan || user.plan || "").toLowerCase();
  return p === "team";
}

const CREATE: NavItem[] = [
  { href: "/documents", label: "Docs", icon: TbFiles },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable },
  { href: "/slides", label: "Decks", icon: TbPresentation },
  { href: "/design", label: "Design", icon: TbPalette },
];

const TROS: NavItem[] = [
  { href: "/tros", label: "Library", icon: TbRobot },
  { href: "/tros/artifacts", label: "Artifacts", icon: FiLayers },
];

function isActive(pathname: string, href: string) {
  const base = href.split("?")[0] || href;
  if (pathname === base) return true;
  if (base === "/dashboard") return false;
  if (base === "/tros") {
    if (pathname === "/tros") return true;
    return /^\/tros\/[^/]+$/.test(pathname) && !pathname.startsWith("/tros/artifacts");
  }
  return pathname.startsWith(base + "/") || pathname.startsWith(base + "?");
}

function NavLink({
  item,
  pathname,
  compact,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  if (compact) {
    return (
      <Tooltip label={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            active
              ? "bg-hover text-ink ring-1 ring-line"
              : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          <Icon size={18} />
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
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors",
        active
          ? "bg-hover font-medium text-ink ring-1 ring-line"
          : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Icon size={18} className={cn("shrink-0", active ? "text-ink" : "text-ink-3")} />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

function AccountMenu({
  user,
  compact,
  onNavigate,
}: {
  user: User;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { openSettings } = useNav();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const initial = user.name.slice(0, 1).toUpperCase();

  if (compact) {
    return (
      <Tooltip label={user.name} side="right">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            openSettings("general");
          }}
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sunk text-[12px] font-semibold text-ink ring-1 ring-line"
          aria-label="Settings"
        >
          {initial}
        </button>
      </Tooltip>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-hover"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunk text-[12px] font-semibold text-ink ring-1 ring-line">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-4">
            {user.effectivePlan || user.plan} plan
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-90")}
        />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[200px] overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              openSettings("general");
            }}
          >
            <FiSettings size={14} /> Settings
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              openSettings("wallet");
            }}
          >
            <FiCreditCard size={14} /> Billing
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              openSettings("general");
            }}
          >
            <FiUser size={14} /> Account
          </button>
          <div className="my-1 border-t border-line" />
          <form action={logOut}>
            <button
              type="submit"
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
}: {
  user: User | null;
  balance?: Balance | null;
}) {
  const pathname = usePathname() || "/";
  const { open, setOpen, collapsed, toggleCollapsed, openSettings } = useNav();
  const isTrosPath = useIsTrosProduct(pathname);
  const isDesktop = useIsDesktopClient();
  const canTros = userHasTrosAccess(user);
  const isTros = isTrosPath && isDesktop && canTros;
  const close = () => setOpen(false);

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
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const onTeamPlan = isTeamPlan(user);
  const mainItems = isTros
    ? TROS
    : onTeamPlan
      ? [...MAIN, TEAM_NAV]
      : MAIN;
  const createItems = isTros ? [] : CREATE;

  const body = (compact: boolean) => (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 px-2",
          compact ? "flex-col gap-2 py-3" : "h-14",
        )}
      >
        <div className={cn(compact ? "" : "min-w-0 flex-1")}>
          <ProductSwitcher
            collapsed={compact}
            onNavigate={close}
            canUseTros={canTros}
          />
        </div>

        <button
          type="button"
          onClick={close}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink lg:hidden"
          aria-label="Close sidebar"
        >
          <FiX size={18} />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink lg:flex"
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          title={compact ? "Expand" : "Collapse"}
        >
          <FiSidebar size={17} />
        </button>
      </div>

      <div className="shrink-0 px-2 pb-2">
        {compact ? (
          <Tooltip label={isTros ? "New Tro" : "New chat"} side="right">
            <Link
              href={isTros ? "/tros?new=1" : "/chat"}
              onClick={close}
              aria-label={isTros ? "New Tro" : "New chat"}
              className="btn-grad mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <FiPlus size={18} />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href={isTros ? "/tros?new=1" : "/chat"}
            onClick={close}
            className="btn-grad flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold"
          >
            <FiPlus size={16} />
            {isTros ? "New Tro" : "New chat"}
          </Link>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {!compact ? (
          <p className="px-2 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
            {isTros ? "Tros" : "Workspace"}
          </p>
        ) : (
          <div className="h-1" />
        )}

        {mainItems.map((item) => (
          <NavLink
            key={item.href + item.label}
            item={item}
            pathname={pathname}
            compact={compact}
            onNavigate={close}
          />
        ))}

        {createItems.length > 0 ? (
          <>
            {!compact ? (
              <p className="px-2 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                Create
              </p>
            ) : (
              <div className="mx-2 my-2 border-t border-line" />
            )}
            {createItems.map((item) => (
              <NavLink
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                compact={compact}
                onNavigate={close}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-2">
        {user ? (
          <AccountMenu user={user} compact={compact} onNavigate={close} />
        ) : (
          <Link
            href="/login"
            onClick={close}
            className="btn-grad flex h-10 w-full items-center justify-center rounded-xl text-[13.5px] font-semibold"
          >
            Log in
          </Link>
        )}

        {!compact ? (
          <div className="flex items-center gap-0.5">
            <Tooltip label="Settings" side="top">
              <button
                type="button"
                onClick={() => {
                  close();
                  openSettings("general");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                aria-label="Settings"
              >
                <FiSettings size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Plans" side="top">
              <Link
                href={isTros ? "/plans?from=tros" : "/plans?from=trove"}
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                aria-label="Plans"
              >
                <FiCreditCard size={16} />
              </Link>
            </Tooltip>
            <Tooltip label="Help" side="top">
              <button
                type="button"
                onClick={() => {
                  close();
                  openSettings("help");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
                aria-label="Help"
              >
                <TbHelpCircle size={16} />
              </button>
            </Tooltip>
            <span className="flex-1" />
            <ThemeToggle />
          </div>
        ) : null}

        {balance && !compact ? (
          <div className="flex items-center justify-between rounded-xl bg-sunk px-3 py-2">
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
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-300 ease-out lg:flex lg:flex-col",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        {body(collapsed)}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close sidebar"
            onClick={close}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col overflow-hidden border-r border-line bg-rail shadow-2xl">
            {body(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
