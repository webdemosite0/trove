"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useNav } from "@/components/shell/nav-state";
import type { IconType } from "@/components/ui/icons";
import {
  FiPlus,
  FiX,
  FiMenu,
  FiBell,
  FiMoreHorizontal,
  FiSettings,
  FiCreditCard,
  FiUsers,
  FiLogOut,
  TbLayoutDashboard,
  TbMessageCircle,
  TbFiles,
  TbTable,
  TbPresentation,
  TbPalette,
  TbRobot,
  TbHelpCircle,
  TbSearch,
  TbPlugConnected,
  TbBell,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { Drawer } from "@/components/mobile/drawer";
import { logOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { Balance } from "@/lib/types";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";

type Item = {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
  /** Opens the settings overlay at this section instead of navigating. */
  settingsSection?: string;
};

/** Same destinations as desktop sidebar — no Projects, no theme control here. */
const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
  { href: "/slides", label: "Decks", icon: TbPresentation, motion: "launch" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/research", label: "Research", icon: TbSearch, motion: "scan" },
  { href: "/agents", label: "Tros", icon: TbRobot, motion: "ring" },
  { href: "/settings", label: "Plugins", icon: TbPlugConnected, motion: "nudge", settingsSection: "integrations" },
  { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring" },
  { href: "/team", label: "Team", icon: FiUsers, motion: "stack" },
];

/** Bottom tab bar: 4 key destinations max (3–4 ideal). Tros are desktop-only,
    so Agents stays in the drawer only; Plugins lives in the more menu. */
const TABS: Item[] = [
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "sparkle" },
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "panel" },
  { href: "/documents", label: "Docs", icon: TbFiles, motion: "stack" },
  { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/home";
  if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
  return pathname === href || pathname.startsWith(href + "/");
}

/** Studio tools own Chat / Preview tabs — hide global bottom bar. */
function isStudioTool(pathname: string) {
  return /^\/(documents|spreadsheets|slides|design|research|code)(\/|$)/.test(
    pathname,
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function MobileShell({
  user,
  balance,
  children,
}: {
  user: { name: string; email: string };
  balance: Balance | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { openSettings } = useNav();
  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [liveBalance, setLiveBalance] = React.useState<Balance | null>(balance);
  const [dueCount, setDueCount] = React.useState(0);
  const isTeam = pathname === "/team" || pathname.startsWith("/team/");

  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => setMenuOpen(false), [pathname]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  React.useEffect(() => {
    if (isTeam) return;
    let controller: AbortController | null = null;
    const loadMeta = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void fetch("/api/shell-meta?only=balance", { cache: "no-store", signal })
        .then(async (res) =>
          res.ok ? ((await res.json()) as { balance?: Balance | null }) : null,
        )
        .then((data) => data && setLiveBalance(data.balance ?? null))
        .catch(() => null);
      void fetch("/api/shell-meta?only=due", { cache: "no-store", signal })
        .then(async (res) =>
          res.ok ? ((await res.json()) as { due?: number }) : null,
        )
        .then((data) => data && setDueCount(Math.max(0, data.due ?? 0)))
        .catch(() => null);
    };
    loadMeta();
    window.addEventListener("trove:shell-meta-refresh", loadMeta);
    return () => {
      controller?.abort();
      window.removeEventListener("trove:shell-meta-refresh", loadMeta);
    };
  }, [isTeam, pathname]);

  const activeItem = React.useMemo(
    () => PRIMARY.find((item) => isActive(pathname, item.href)) ?? null,
    [pathname],
  );

  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const studio = isStudioTool(pathname);
  const title = isChat ? "Trove" : activeItem?.label || "Trove";
  // On studio tools, + starts a new item of that tool — not a chat.
  const studioNewHref = studio
    ? (activeItem?.href ?? (pathname.split("/").slice(0, 2).join("/") || "/chat"))
    : "/chat";
  const studioNewLabel = studio
    ? `New ${(activeItem?.label ?? "item").replace(/s$/, "") || "item"}`
    : "New chat";
  const credits =
    liveBalance && typeof liveBalance.remaining === "number"
      ? liveBalance.remaining
      : null;

  const menuItems: { label: string; icon: IconType; run: () => void }[] = [
    { label: studioNewLabel, icon: FiPlus, run: () => router.push(studioNewHref) },
    {
      label: "Plugins",
      icon: TbPlugConnected,
      run: () => openSettings("integrations"),
    },
    { label: "Settings", icon: FiSettings, run: () => openSettings("general") },
    { label: "Plan", icon: FiCreditCard, run: () => router.push("/plans") },
    { label: "Help", icon: TbHelpCircle, run: () => openSettings("help") },
  ];

  if (isTeam) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "mobile-shell flex flex-col bg-canvas text-ink",
        isChat || studio ? "h-dvh min-h-0 overflow-hidden" : "min-h-dvh",
      )}
    >
      <header
        className="mobile-shell-header sticky top-0 z-40 flex items-center gap-1.5 border-b border-line/55 bg-canvas/90 px-2 backdrop-blur-2xl"
        style={{
          minHeight: "calc(52px + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
        >
          <Ico icon={FiMenu} motion="menu" size={20} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {isChat ? <TroveOrb size={22} /> : null}
          <span className="truncate text-[14.5px] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            key={studioNewLabel}
            type="button"
            aria-label={studioNewLabel}
            onClick={() => router.push(studioNewHref)}
            className="mobile-header-swap grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
          >
            <Ico icon={FiPlus} motion="pop" size={20} />
          </button>
          <Link
            href="/reminders"
            aria-label={dueCount > 0 ? `Reminders, ${dueCount} due` : "Reminders"}
            className="relative grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
          >
            <Ico icon={FiBell} motion="ring" size={20} />
            {dueCount > 0 ? (
              <span className="mobile-bell-badge" aria-hidden="true">
                {dueCount > 9 ? "9+" : dueCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
          >
            <Ico icon={FiMoreHorizontal} motion="nudge" size={20} />
          </button>
        </div>
      </header>

      {menuOpen
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[70] cursor-default"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="More actions"
                className="mobile-more-menu fixed right-2 z-[71] w-60 overflow-hidden rounded-2xl border border-line/70 bg-raised shadow-2xl"
                style={{ top: "calc(58px + env(safe-area-inset-top))" }}
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        item.run();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-[13.5px] text-ink-2 transition active:bg-hover"
                    >
                      <Ico icon={item.icon} motion="pop" size={17} className="shrink-0 text-ink-3" />
                      {item.label}
                    </button>
                  ))}
                  <div className="mx-3 my-1.5 h-px bg-line/70" aria-hidden="true" />
                  <form action={logOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-[13.5px] text-ink-2 transition active:bg-hover"
                    >
                      <FiLogOut size={16} className="shrink-0 text-ink-3" />
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}

      <main
        className={cn(
          "mobile-shell-main min-h-0 flex-1",
          isChat || studio
            ? "overflow-hidden"
            : "overflow-y-auto overscroll-contain",
        )}
        style={
          !isChat && !studio
            ? { paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        {children}
      </main>

      {!isChat && !studio ? (
        <nav
          aria-label="Primary"
          className="mobile-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-canvas/92 backdrop-blur-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto flex h-14 max-w-[560px] items-stretch justify-between px-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <li key={tab.href} className="flex min-w-0 flex-1">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "mobile-tab flex w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition active:scale-95",
                      active ? "text-accent" : "text-ink-4",
                    )}
                  >
                    <Ico
                      icon={tab.icon}
                      motion={tab.motion}
                      size={20}
                      active={active}
                      className={active ? "text-accent" : "text-ink-3"}
                    />
                    <span className="truncate">{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="nx-mobile-drawer flex h-full flex-col bg-rail">
          <div
            className="flex shrink-0 items-center gap-2 border-b border-line px-3 pb-3"
            style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}
          >
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <TroveOrb size={28} />
              <Wordmark size={18} />
            </Link>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              <FiX size={17} />
            </button>
          </div>

          <div className="px-2.5 py-2">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="btn-grad flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white"
            >
              <Ico icon={FiPlus} motion="grow" size={15} />
              New chat
            </Link>
          </div>

          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
            {PRIMARY.map((item) => {
              const active = isActive(pathname, item.href);
              const inner = (
                <>
                  <Ico
                    icon={item.icon}
                    motion={item.motion}
                    size={17}
                    active={active}
                    className={cn("shrink-0", active ? "text-ink" : "text-ink-3")}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              );
              const cls = cn(
                "group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px] transition-colors",
                active
                  ? "bg-hover font-medium text-ink"
                  : "text-ink-2 hover:bg-hover hover:text-ink",
              );
              return item.settingsSection ? (
                <button
                  key={item.href + item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openSettings(item.settingsSection!);
                  }}
                  className={cn(cls, "w-full text-left")}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cls}
                >
                  {inner}
                </Link>
              );
            })}
          </nav>

          <div
            className="shrink-0 space-y-2 border-t border-line p-2.5"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
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
              <button
                type="button"
                onClick={() => { setOpen(false); openSettings("general"); }}
                aria-label="Settings"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover hover:text-ink"
              >
                <Ico icon={FiSettings} motion="spin" size={16} className="text-ink" />
              </button>
              <Link
                href="/plans"
                onClick={() => setOpen(false)}
                aria-label="Plan"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover hover:text-ink"
              >
                <Ico icon={FiCreditCard} motion="pop" size={16} className="text-ink" />
              </Link>
              <button
                type="button"
                onClick={() => { setOpen(false); openSettings("help"); }}
                aria-label="Help"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink transition-colors hover:bg-hover hover:text-ink"
              >
                <Ico icon={TbHelpCircle} motion="ring" size={16} className="text-ink" />
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); openSettings("general"); }}
                className="ml-auto rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink"
              >
                Theme
              </button>
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
                >
                  <FiLogOut size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
