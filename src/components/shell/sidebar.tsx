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
  TbLayoutDashboard,
  TbMessageCircle,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbRobot,
  TbHelpCircle,
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
  tone: string;
  activeTone: string;
}

const PRIMARY: Item[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: TbLayoutDashboard,
    motion: "panel",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/chat",
    label: "Chat",
    icon: TbMessageCircle,
    motion: "sparkle",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/documents",
    label: "Docs",
    icon: TbFiles,
    motion: "stack",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/spreadsheets",
    label: "Sheets",
    icon: TbTable,
    motion: "scan",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/slides",
    label: "Decks",
    icon: TbPresentation,
    motion: "launch",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/design",
    label: "Design",
    icon: TbPalette,
    motion: "pop",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
  {
    href: "/agents",
    label: "Agents",
    icon: TbRobot,
    motion: "ring",
    tone: "text-ink",
    activeTone: "text-ink bg-sunk",
  },
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
            "group grid h-9 w-9 place-items-center rounded-xl transition-all duration-[var(--t-hover)] hover:-translate-y-0.5",
            active ? "bg-hover shadow-[var(--sh-1)]" : "hover:bg-hover",
          )}
        >
          <span
            className={cn(
              "grid size-7 place-items-center rounded-lg transition-all duration-[var(--t-hover)] group-hover:scale-105",
              active ? item.activeTone : item.tone,
            )}
          >
            <Ico
              icon={item.icon}
              motion={item.motion}
              size={16}
              active={active}
              className="text-ink"
            />
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
        "group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13.5px] font-medium transition-all duration-[var(--t-hover)]",
        active
          ? "rail-item-active bg-hover text-ink shadow-[var(--sh-1)]"
          : "text-ink-3 hover:translate-x-0.5 hover:bg-hover hover:text-ink",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-xl transition-all duration-[var(--t-hover)] group-hover:scale-105",
          active ? item.activeTone : item.tone,
        )}
      >
        <Ico
          icon={item.icon}
          motion={item.motion}
          size={16}
          active={active}
          className="text-ink"
        />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function UserMenu({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-hover"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line">
          {(user.name || "U").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-3">
            {user.plan || "free"}
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn("shrink-0 text-ink-3 transition-transform", open && "rotate-90")}
        />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-xl border border-line bg-raised shadow-lg">
          <Link
            href="/settings"
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
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-hover"
          >
            <FiCreditCard size={15} className="text-ink" />
            Plans
          </Link>
          <form action={logOut} className="border-t border-line">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-hover"
            >
              <FiLogOut size={15} className="text-ink" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ReferralCard() {
  return (
    <Link
      href="/affiliates"
      className={cn(
        "group relative block overflow-hidden rounded-2xl p-3",
        "bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-sky-500/15",
        "ring-1 ring-violet-400/20 transition hover:ring-violet-400/40",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-20 rounded-full",
          "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 blur-2xl",
        )}
      />
      <p className={cn("relative text-[12px] font-semibold tracking-wide text-ink")}>
        Refer & earn
      </p>
      <p className="relative mt-0.5 text-[11px] leading-snug text-ink-3">
        Share Trove — get credits for paid referrals
      </p>
      <div className="relative mt-2">
        <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-canvas">
          Open affiliates
        </span>
      </div>
    </Link>
  );
}

function SidebarBody({
  user,
  compact,
  onNavigate,
}: {
  user: User;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const { setCollapsed } = useNav();

  return (
    <>
      <div className="flex items-center gap-2 px-3 pt-3">
        {compact ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
          >
            <Ico icon={FiSidebar} motion="nudge" size={17} className="text-ink" />
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2 px-1">
              <TroveOrb size={22} />
              <Wordmark size={18} />
            </Link>
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <Ico icon={FiSidebar} motion="nudge" size={17} className="text-ink" />
            </button>
          </>
        )}
      </div>

      <div className="px-3 pt-3">
        <Link
          href="/chat"
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-3 py-2 text-[13px] font-medium text-ink",
            "transition hover:bg-hover",
            compact && "px-0",
          )}
        >
          <Ico icon={FiPlus} motion="grow" size={15} className="text-ink" />
          {!compact ? "New chat" : null}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {PRIMARY.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            compact={compact}
          />
        ))}
      </nav>

      {!compact ? (
        <div className="space-y-2 border-t border-line px-3 py-3">
          <ReferralCard />
          <UserMenu user={user} onNavigate={onNavigate} />
        </div>
      ) : (
        <div className="space-y-1 border-t border-line px-2 py-3">
          <Tooltip label="Account" side="right">
            <Link
              href="/settings"
              onClick={onNavigate}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-hover"
            >
              <Ico icon={FiUser} motion="tilt" size={14} className="text-ink" />
            </Link>
          </Tooltip>
          <Tooltip label="Plans" side="right">
            <Link
              href="/plans"
              onClick={onNavigate}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-hover"
            >
              <Ico icon={FiCreditCard} motion="pop" size={16} className="text-ink" />
            </Link>
          </Tooltip>
        </div>
      )}

      {!compact ? (
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <ThemeToggle />
          <Link
            href="/settings"
            onClick={onNavigate}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
          >
            <Ico icon={FiSettings} motion="spin" size={16} className="text-ink" />
          </Link>
        </div>
      ) : null}
    </>
  );
}

export function Sidebar({ user }: { user: User; balance?: Balance | null }) {
  const { open, setOpen, collapsed } = useNav();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <aside
        className={cn(
          "nx-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail text-ink transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          collapsed ? "w-[68px]" : "w-[240px]",
        )}
      >
        <SidebarBody user={user} compact={collapsed} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="nx-sidebar absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-rail text-ink shadow-xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <FiX size={17} className="text-ink" />
            </button>
            <SidebarBody user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
