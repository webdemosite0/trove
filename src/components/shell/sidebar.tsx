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
}

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift" },
  { href: "/sites", label: "Sites", icon: TbWorld, motion: "spin" },
  { href: "/docs", label: "Docs", icon: TbFileText, motion: "tilt" },
  { href: "/sheets", label: "Sheets", icon: TbTable, motion: "nudge" },
  { href: "/decks", label: "Decks", icon: TbPresentation, motion: "pop" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "lift" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "shake" },
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
            "grid h-9 w-9 place-items-center rounded-lg transition-colors",
            active ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          <Ico icon={item.icon} motion={item.motion} size={17} />
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
        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors",
        active
          ? "bg-hover font-medium text-ink"
          : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Ico
        icon={item.icon}
        motion={item.motion}
        size={17}
        className={cn("shrink-0", active ? "text-ink" : "text-ink-3")}
      />
      <span className="truncate">{item.label}</span>
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

function ReferralPromo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/settings/affiliates"
      onClick={onNavigate}
      className="group relative block overflow-hidden rounded-2xl border border-line-strong bg-raised p-3 shadow-[var(--elev)] transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--elev-lift)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-accent) 16%, transparent), transparent 42%), radial-gradient(circle at 0% 100%, color-mix(in oklab, var(--color-violet) 10%, transparent), transparent 46%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-accent">
            Referral
          </span>
          <span className="grid size-6 place-items-center rounded-full border border-line bg-canvas text-accent transition group-hover:translate-x-0.5">
            <FiChevronRight size={12} />
          </span>
        </div>

        <p className="mt-2.5 text-[13px] font-semibold leading-snug text-ink">
          Invite people. Earn rewards.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
          Get credits for signups and unlock a cash reward from paid referrals.
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-line bg-canvas/80 px-2 py-1 text-[10px] font-semibold text-ink-2">
            Credits per signup
          </span>
          <span className="rounded-full border border-line bg-canvas/80 px-2 py-1 text-[10px] font-semibold text-ink-2">
            $200 goal
          </span>
        </div>
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
                href="/settings/affiliates"
                title="Refer & earn"
                className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-line-strong bg-raised text-[11px] font-bold text-accent shadow-[var(--elev)] transition hover:border-accent/35 hover:bg-accent-soft"
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
