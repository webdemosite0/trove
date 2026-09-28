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
  FiUsers,
  TbLayoutDashboard,
  TbMessageCircle,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbWorld,
  TbRobot,
  TbFolder,
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
  teamOnly?: boolean;
}

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/projects", label: "Projects", icon: TbFolder, motion: "stack" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/websites", label: "Websites", icon: TbWorld, motion: "grow" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "ring" },
  { href: "/team", label: "Team", icon: FiUsers, motion: "stack", teamOnly: true },
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
            active
              ? "bg-hover text-ink"
              : "text-ink-3 hover:bg-hover hover:text-ink",
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
        active={active}
        className={cn("shrink-0", active ? "text-ink" : "text-ink-3")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function RailBody({
  user,
  balance,
  isAdmin,
  onNavigate,
  onCollapse,
}: {
  user: User | null;
  balance: Balance | null;
  isAdmin?: boolean;
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const credits =
    balance && typeof balance.remaining === "number" ? balance.remaining : null;

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-2 border-b border-line px-3 pb-3"
        style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}
      >
        <Link
          href="/chat"
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <TroveOrb size={28} />
          <Wordmark size={18} />
        </Link>
        {onCollapse ? (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={onCollapse}
            className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <FiSidebar size={16} />
          </button>
        ) : null}
      </div>

      <div className="px-2.5 py-2">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white"
        >
          <Ico icon={FiPlus} motion="grow" size={15} />
          New chat
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
        {PRIMARY.filter(
          (it) =>
            !it.teamOnly ||
            Boolean(user?.teamMember) ||
            Boolean(user?.teamPlanActive) ||
            user?.effectivePlan === "team" ||
            user?.plan === "team",
        ).map((it) => (
          <NavRow
            key={it.href}
            item={it}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div
        className="shrink-0 space-y-2 border-t border-line p-2.5"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {user ? (
          <>
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink ring-1 ring-line">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] text-ink-4">
                  {user.email}
                  {credits != null ? ` · ${credits.toLocaleString()} cr` : ""}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                onClick={onNavigate}
                aria-label="Settings"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={FiSettings} motion="spin" size={16} className="text-ink" />
              </Link>
              <Link
                href="/plans"
                onClick={onNavigate}
                aria-label="Plan"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={FiCreditCard} motion="pop" size={16} className="text-ink" />
              </Link>
              <Link
                href="/settings/support"
                onClick={onNavigate}
                aria-label="Help"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={TbHelpCircle} motion="ring" size={16} className="text-ink" />
              </Link>
              <ThemeToggle />
              <form action={logOut} className="ml-auto">
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
                >
                  <FiLogOut size={15} />
                </button>
              </form>
            </div>

            {isAdmin ? (
              <Link
                href="/admin"
                onClick={onNavigate}
                className="block rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-3 hover:bg-hover hover:text-ink"
              >
                Admin
              </Link>
            ) : null}

            <Link
              href="/affiliates"
              onClick={onNavigate}
              className="flex items-center justify-between rounded-xl border border-line bg-raised/60 px-3 py-2 text-[12.5px] font-medium text-ink hover:bg-hover"
            >
              <span>Refer & earn</span>
              <FiChevronRight size={14} className="text-ink-4" />
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="btn-grad flex h-9 w-full items-center justify-center rounded-full text-[13px] font-semibold text-white"
          >
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
  isAdmin,
}: {
  user: User | null;
  balance: Balance | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const { collapsed, setCollapsed } = useNav();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 grid size-10 place-items-center rounded-full border border-line bg-rail/90 text-ink shadow-sm backdrop-blur lg:hidden"
        style={{ top: "max(12px, env(safe-area-inset-top))" }}
      >
        <FiSidebar size={18} />
      </button>

      <aside
        className={cn(
          "nx-no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        {collapsed ? (
          <div className="flex h-full min-h-0 flex-col items-center px-1.5 py-3">
            <div className="mb-2 flex w-full flex-col items-center gap-1.5">
              <Link href="/chat" aria-label="Home">
                <TroveOrb size={28} />
              </Link>
              <button
                type="button"
                aria-label="Expand sidebar"
                onClick={() => setCollapsed(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
              >
                <FiSidebar size={16} />
              </button>
              <Link
                href="/chat"
                aria-label="New chat"
                className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white"
              >
                <Ico icon={FiPlus} motion="grow" size={16} />
              </Link>
            </div>

            <div className="mt-1 flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-none">
              {PRIMARY.filter(
                (i) =>
                  !i.teamOnly ||
                  Boolean(user?.teamMember) ||
                  Boolean(user?.teamPlanActive) ||
                  user?.effectivePlan === "team" ||
                  user?.plan === "team",
              ).map((i) => (
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
            <RailBody
              user={user}
              balance={balance}
              isAdmin={isAdmin}
              onCollapse={() => setCollapsed(true)}
            />
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
              <RailBody
                user={user}
                balance={balance}
                isAdmin={isAdmin}
                onNavigate={() => setOpen(false)}
              />
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
