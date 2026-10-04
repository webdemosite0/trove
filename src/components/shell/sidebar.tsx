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
  TbBell,
  TbPuzzle,
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

const MORE: NavItem[] = [
  { href: "/reminders", label: "Reminders", icon: TbBell },
  { href: "/team", label: "Team", icon: TbUsers },
  { href: "/skills", label: "Skills", icon: TbPuzzle },
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
            "mx-auto flex h-9 w-9 items-center justify-center rounded-xl transition-all",
            active
              ? "bg-accent/15 text-ink ring-1 ring-accent/40"
              : "text-ink-2 hover:bg-hover hover:text-ink",
          )}
        >
          <Icon size={19} />
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
  const { open, setOpen, collapsed, setCollapsed, toggleCollapsed, openSettings } = useNav();
  const isTrosPath = useIsTrosProduct(pathname);
  const isDesktop = useIsDesktopClient();
  const canTros = userHasTrosAccess(user);
  const isTros = isTrosPath && isDesktop && canTros;
  const closeDrawer = () => setOpen(false);
  const closePanel = () => setCollapsed(true);
  // Desktop app rail: a rail nav click navigates AND opens the floating panel.
  // The pathname effect below must not immediately close it again.
  const railNavOpen = useRef(false);
  const onRailNavigate = () => {
    railNavOpen.current = true;
    setCollapsed(false);
  };

  useEffect(() => {
    setOpen(false);
    if (isDesktop) {
      if (railNavOpen.current) railNavOpen.current = false;
      else setCollapsed(true);
    }
  }, [pathname, setOpen, setCollapsed, isDesktop]);

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

  // Desktop app floating panel: Escape closes it (no scroll lock — it's an overlay).
  useEffect(() => {
    if (!isDesktop || collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapsed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, collapsed, setCollapsed]);

  const onTeamPlan = isTeamPlan(user);
  const mainItems = isTros
    ? TROS
    : onTeamPlan
      ? [...MAIN, TEAM_NAV]
      : MAIN;
  const createItems = isTros ? [] : CREATE;

  const body = (opts: {
    compact: boolean;
    /** Desktop-app floating panel: X close button instead of the collapse toggle. */
    panel?: boolean;
    onNavigate: () => void;
  }) => (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 px-2",
          opts.compact ? "flex-col gap-2 py-3" : "h-14",
        )}
      >
        <div className={cn(opts.compact ? "" : "min-w-0 flex-1")}>
          <ProductSwitcher
            collapsed={opts.compact}
            onNavigate={opts.onNavigate}
            canUseTros={canTros}
          />
        </div>

        {opts.panel ? (
          <button
            type="button"
            onClick={opts.onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink"
            aria-label="Close sidebar"
          >
            <FiX size={18} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={closeDrawer}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink lg:hidden"
              aria-label="Close sidebar"
            >
              <FiX size={18} />
            </button>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-hover hover:text-ink lg:flex"
              aria-label={opts.compact ? "Expand sidebar" : "Collapse sidebar"}
              title={opts.compact ? "Expand" : "Collapse"}
            >
              <FiSidebar size={17} />
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 px-2 pb-2">
        {opts.compact ? (
          <Tooltip label={isTros ? "New Tro" : "New chat"} side="right">
            <Link
              href={isTros ? "/tros?new=1" : "/chat"}
              onClick={opts.onNavigate}
              aria-label={isTros ? "New Tro" : "New chat"}
              className="btn-grad mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <FiPlus size={18} />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href={isTros ? "/tros?new=1" : "/chat"}
            onClick={opts.onNavigate}
            className="btn-grad flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold"
          >
            <FiPlus size={16} />
            {isTros ? "New Tro" : "New chat"}
          </Link>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {!opts.compact ? (
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
            compact={opts.compact}
            onNavigate={opts.onNavigate}
          />
        ))}

        {createItems.length > 0 ? (
          <>
            {!opts.compact ? (
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
                compact={opts.compact}
                onNavigate={opts.onNavigate}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-2">
        {user ? (
          <AccountMenu user={user} compact={opts.compact} onNavigate={opts.onNavigate} />
        ) : (
          <Link
            href="/login"
            onClick={opts.onNavigate}
            className="btn-grad flex h-10 w-full items-center justify-center rounded-xl text-[13.5px] font-semibold"
          >
            Log in
          </Link>
        )}

        {!opts.compact ? (
          <div className="flex items-center gap-0.5">
            <Tooltip label="Settings" side="top">
              <button
                type="button"
                onClick={() => {
                  opts.onNavigate();
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
                onClick={opts.onNavigate}
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
                  opts.onNavigate();
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

        {balance && !opts.compact ? (
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

  // Desktop-app only: permanent slim icon rail. Every nav click navigates
  // AND opens the floating panel (via onRailNavigate).
  const railBody = () => (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 flex-col items-center pt-2">
        <Tooltip label="Open sidebar" side="right">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Open sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiSidebar size={19} />
          </button>
        </Tooltip>
      </div>

      <nav
        aria-label="Primary"
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-2 pb-2"
      >
        {mainItems.map((item) => (
          <NavLink
            key={item.href + item.label}
            item={item}
            pathname={pathname}
            compact
            onNavigate={onRailNavigate}
          />
        ))}
        {createItems.length > 0 ? (
          <>
            <div className="my-1.5 w-6 shrink-0 border-t border-line" aria-hidden="true" />
            {createItems.map((item) => (
              <NavLink
                key={item.href + item.label}
                item={item}
                pathname={pathname}
                compact
                onNavigate={onRailNavigate}
              />
            ))}
          </>
        ) : null}
        <div className="my-1.5 w-6 shrink-0 border-t border-line" aria-hidden="true" />
        {MORE.map((item) => (
          <NavLink
            key={item.href + item.label}
            item={item}
            pathname={pathname}
            compact
            onNavigate={onRailNavigate}
          />
        ))}
      </nav>

      <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t border-line p-1.5">
        <Tooltip label="Settings" side="right">
          <button
            type="button"
            onClick={() => openSettings("general")}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiSettings size={19} />
          </button>
        </Tooltip>
        {user ? (
          <AccountMenu user={user} compact onNavigate={() => {}} />
        ) : (
          <Tooltip label="Log in" side="right">
            <Link
              href="/login"
              aria-label="Log in"
              className="btn-grad flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <FiUser size={18} />
            </Link>
          </Tooltip>
        )}
      </div>
    </div>
  );

  // ---- Desktop app: rail + floating panel ----
  if (isDesktop) {
    return (
      <>
        <aside
          aria-label="Primary"
          className="sticky top-0 hidden h-dvh w-[52px] shrink-0 flex-col border-r border-line bg-rail lg:flex"
        >
          {railBody()}
        </aside>

        {!collapsed ? (
          <div className="fixed inset-0 z-40 hidden lg:block">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={closePanel}
              className="absolute inset-0 cursor-default bg-transparent"
            />
            <aside
              role="dialog"
              aria-label="Sidebar"
              className="sidebar-panel-in absolute inset-y-0 left-[52px] flex w-[280px] flex-col overflow-hidden border-r border-line bg-rail shadow-2xl"
            >
              {body({ compact: false, panel: true, onNavigate: closePanel })}
            </aside>
          </div>
        ) : null}

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close sidebar"
              onClick={closeDrawer}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col overflow-hidden border-r border-line bg-rail shadow-2xl">
              {body({ compact: false, onNavigate: closeDrawer })}
            </aside>
          </div>
        ) : null}
      </>
    );
  }

  // ---- Web + mobile: existing behavior, untouched ----
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-line bg-rail transition-[width] duration-300 ease-out lg:flex lg:flex-col",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        {body({ compact: collapsed, onNavigate: closeDrawer })}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close sidebar"
            onClick={closeDrawer}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col overflow-hidden border-r border-line bg-rail shadow-2xl">
            {body({ compact: false, onNavigate: closeDrawer })}
          </aside>
        </div>
      ) : null}
    </>
  );
}
