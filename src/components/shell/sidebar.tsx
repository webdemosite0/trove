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
  FiShare2,
  TbRobot,
  TbWorld,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbMessageCircle,
  TbHelpCircle,
  TbLayoutDashboard,
  TbFiles,
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

type ItemTone =
  | "indigo"
  | "sky"
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "fuchsia"
  | "rose"
  | "orange";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
  tone: ItemTone;
}

const TONE: Record<
  ItemTone,
  { icon: string; tile: string; active: string; marker: string }
> = {
  indigo: {
    icon: "text-indigo-600 dark:text-indigo-300",
    tile: "bg-indigo-500/10 ring-indigo-500/15",
    active: "from-indigo-500/14 via-indigo-500/7 to-transparent",
    marker: "bg-indigo-500",
  },
  sky: {
    icon: "text-sky-600 dark:text-sky-300",
    tile: "bg-sky-500/10 ring-sky-500/15",
    active: "from-sky-500/14 via-sky-500/7 to-transparent",
    marker: "bg-sky-500",
  },
  cyan: {
    icon: "text-cyan-600 dark:text-cyan-300",
    tile: "bg-cyan-500/10 ring-cyan-500/15",
    active: "from-cyan-500/14 via-cyan-500/7 to-transparent",
    marker: "bg-cyan-500",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-300",
    tile: "bg-emerald-500/10 ring-emerald-500/15",
    active: "from-emerald-500/14 via-emerald-500/7 to-transparent",
    marker: "bg-emerald-500",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-300",
    tile: "bg-amber-500/10 ring-amber-500/15",
    active: "from-amber-500/14 via-amber-500/7 to-transparent",
    marker: "bg-amber-500",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-300",
    tile: "bg-violet-500/10 ring-violet-500/15",
    active: "from-violet-500/14 via-violet-500/7 to-transparent",
    marker: "bg-violet-500",
  },
  fuchsia: {
    icon: "text-fuchsia-600 dark:text-fuchsia-300",
    tile: "bg-fuchsia-500/10 ring-fuchsia-500/15",
    active: "from-fuchsia-500/14 via-fuchsia-500/7 to-transparent",
    marker: "bg-fuchsia-500",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-300",
    tile: "bg-rose-500/10 ring-rose-500/15",
    active: "from-rose-500/14 via-rose-500/7 to-transparent",
    marker: "bg-rose-500",
  },
  orange: {
    icon: "text-orange-600 dark:text-orange-300",
    tile: "bg-orange-500/10 ring-orange-500/15",
    active: "from-orange-500/14 via-orange-500/7 to-transparent",
    marker: "bg-orange-500",
  },
};

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "pop", tone: "indigo" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift", tone: "sky" },
  { href: "/websites", label: "Sites", icon: TbWorld, motion: "spin", tone: "cyan" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "tilt", tone: "violet" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "nudge", tone: "emerald" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "pop", tone: "amber" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "lift", tone: "fuchsia" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "shake", tone: "rose" },
  { href: "/affiliates", label: "Affiliates", icon: FiShare2, motion: "pop", tone: "orange" },
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
            "relative grid h-9 w-9 place-items-center rounded-xl transition-all",
            active
              ? "bg-raised shadow-[var(--sh-1)] ring-1 ring-line-strong"
              : "hover:bg-hover",
          )}
        >
          {active ? (
            <span
              aria-hidden
              className={cn(
                "absolute -left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full",
                TONE[item.tone].marker,
              )}
            />
          ) : null}
          <span
            className={cn(
              "grid size-7 place-items-center rounded-lg ring-1 transition-transform group-hover:scale-[1.04]",
              TONE[item.tone].tile,
              TONE[item.tone].icon,
            )}
          >
            <Ico icon={item.icon} motion={item.motion} size={16} />
          </span>
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
        "group relative flex items-center gap-2.5 overflow-hidden rounded-xl px-2 py-1.5 text-[13.5px] transition-all",
        active
          ? "font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line)]"
          : "text-ink-2 hover:bg-hover/80 hover:text-ink",
      )}
    >
      {active ? (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 bg-gradient-to-r",
              TONE[item.tone].active,
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full",
              TONE[item.tone].marker,
            )}
          />
        </>
      ) : null}
      <span
        className={cn(
          "relative z-[1] grid size-8 shrink-0 place-items-center rounded-xl ring-1 transition-all group-hover:scale-[1.04]",
          TONE[item.tone].tile,
          TONE[item.tone].icon,
        )}
      >
        <Ico icon={item.icon} motion={item.motion} size={16} />
      </span>
      <span className="relative z-[1] truncate">{item.label}</span>
    </Link>
  );
}

function UserMenu({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
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
            {user.plan} plan
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
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-xl border border-line bg-raised shadow-lg"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-hover"
          >
            <FiSettings size={15} className="text-ink" />
            Settings
          </Link>
          <Link
            href="/plans"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-hover"
          >
            <FiCreditCard size={15} className="text-ink" />
            Plan & credits
          </Link>
          <Link
            href="/settings/support"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-hover"
          >
            <TbHelpCircle size={15} className="text-ink" />
            Help & support
          </Link>
          <form action={logOut} className="border-t border-line">
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-hover"
            >
              <FiLogOut size={15} className="text-ink" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ReferralPromoSurface({
  mode,
}: {
  mode: "light" | "dark";
}) {
  const dark = mode === "dark";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[15px] px-3 py-3 backdrop-blur-sm",
        dark
          ? "bg-[#0f1017] text-white ring-1 ring-white/10"
          : "bg-white text-slate-950 ring-1 ring-black/[0.04]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-4 -top-4 size-16 rounded-full blur-2xl",
          dark ? "opacity-55" : "opacity-25",
        )}
        style={{ background: "linear-gradient(135deg,#f472b6,#38bdf8)" }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-6 -left-5 size-14 rounded-full blur-2xl",
          dark ? "opacity-35" : "opacity-15",
        )}
        style={{ background: "linear-gradient(135deg,#a78bfa,#fbbf24)" }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          dark
            ? "bg-gradient-to-br from-fuchsia-500/[0.08] via-transparent to-sky-500/[0.10]"
            : "bg-gradient-to-br from-fuchsia-50/70 via-transparent to-sky-50/70",
        )}
      />
      <div className="relative">
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", dark ? "text-fuchsia-300" : "text-fuchsia-600")}>
          Refer & earn
        </p>
        <p className={cn("mt-1 text-[13px] font-semibold leading-snug", dark ? "text-white" : "text-slate-950")}>
          Share Trove · get credits
        </p>
        <p className={cn("mt-0.5 text-[11px]", dark ? "text-zinc-400" : "text-slate-600")}>
          100 qualified paid → $200
        </p>
        <span className={cn("mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold", dark ? "text-sky-300" : "text-blue-600")}>
          Open affiliates
          <FiChevronRight size={12} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}

function ReferralPromo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/affiliates"
      onClick={onNavigate}
      className="group relative block overflow-hidden rounded-2xl p-[1px] transition hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, #f472b6, #a78bfa, #38bdf8, #fbbf24)",
      }}
    >
      <div className="block dark:hidden">
        <ReferralPromoSurface mode="light" />
      </div>
      <div className="hidden dark:block">
        <ReferralPromoSurface mode="dark" />
      </div>
    </Link>
  );
}

function RailBody({
  user,
  onCollapse,
  onNavigate,
}: {
  user: User | null;
  balance?: Balance | null;
  onCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
        <Link href="/chat" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2">
          <TroveOrb size={28} />
          <Wordmark size={18} />
        </Link>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            title="Toggle sidebar  ⌘B"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
          >
            <Ico icon={FiSidebar} motion="nudge" size={17} className="text-ink" />
          </button>
        ) : null}
      </div>

      <div className="px-2.5 pb-2">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white"
        >
          <FiPlus size={15} />
          New chat
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
        {PRIMARY.map((it) => (
          <NavRow key={it.href} item={it} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-2.5">
        <ReferralPromo onNavigate={onNavigate} />

        {user ? (
          <UserMenu user={user} onNavigate={onNavigate} />
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13.5px] text-ink transition-colors hover:bg-hover"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-ink">
              <Ico icon={FiUser} motion="tilt" size={14} className="text-ink" />
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
              className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <FiSettings size={16} className="text-ink" />
            </Link>
          </Tooltip>
          <Tooltip label="Plan" side="top">
            <Link
              href="/plans"
              onClick={onNavigate}
              aria-label="Plan"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <FiCreditCard size={16} className="text-ink" />
            </Link>
          </Tooltip>
          <Tooltip label="Help" side="top">
            <Link
              href="/settings/support"
              onClick={onNavigate}
              aria-label="Help & support"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <TbHelpCircle size={16} className="text-ink" />
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, setCollapsed]);

  return (
    <>
      <aside
        className={cn(
          "nx-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail text-ink transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        {collapsed ? (
          <div className="flex h-full min-h-0 flex-col items-center overflow-hidden px-1.5 py-3">
            <div className="flex w-full flex-col items-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                title="Toggle sidebar  ⌘B"
                className="mb-1 grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={FiSidebar} motion="nudge" size={17} className="text-ink" />
              </button>
              <Link
                href="/chat"
                title="New chat"
                aria-label="New chat"
                className="btn-grad mb-1 grid h-9 w-9 place-items-center rounded-full text-white"
              >
                <FiPlus size={16} />
              </Link>
            </div>

            <div className="mt-1 flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-none">
              {PRIMARY.map((i) => (
                <NavRow key={i.href} item={i} pathname={pathname} compact />
              ))}
            </div>

            <div className="mt-1 shrink-0 pt-1">
              <Link
                href="/affiliates"
                title="Refer & earn"
                className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-[11px] font-bold text-white shadow-md"
              >
                $
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <RailBody user={user} balance={balance} onCollapse={() => setCollapsed(true)} />
          </div>
        )}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div className="nx-sidebar absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-rail text-ink shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <FiX size={17} className="text-ink" />
            </button>
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <RailBody user={user} balance={balance} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "nx-no-print hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      />
    </>
  );
}
