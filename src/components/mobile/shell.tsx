"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  TbHome,
  TbMessageCircle,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbRobot,
  TbSearch,
  TbUsers,
  TbPlugConnected,
  TbBell,
  TbSettings,
  FiMenu,
  FiX,
  FiPlus,
  FiLogOut,
  TbSparkles,
  FiFolder,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { Drawer } from "@/components/mobile/drawer";
import { cn } from "@/lib/utils";
import type { Balance } from "@/lib/types";

type Dest = {
  href: string;
  label: string;
  icon: IconType;
  motion?: Motion;
  hint?: string;
};

const PRIMARY: Dest[] = [
  { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift" },
  { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
];

const GROUPS: { label: string; items: Dest[] }[] = [
  {
    label: "Create",
    items: [
      { href: "/chat", label: "New chat", icon: TbMessageCircle, motion: "lift", hint: "Talk to Trove" },
      { href: "/documents", label: "Documents", icon: TbFileText, motion: "type", hint: "Docs & briefs" },
      { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable, motion: "stack", hint: "Tables & data" },
      { href: "/slides", label: "Slides", icon: TbPresentation, motion: "grow", hint: "Decks" },
      { href: "/design", label: "Design", icon: TbPalette, motion: "hue", hint: "Screens & UI" },
      { href: "/agents", label: "Agents", icon: TbRobot, motion: "spin", hint: "Automations" },
      { href: "/research", label: "Research", icon: TbSearch, motion: "scan", hint: "Deep answers" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop" },
      { href: "/projects", label: "Projects", icon: FiFolder, motion: "open", hint: "Local & cloud" },
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected, motion: "nudge", hint: "Slack, GitHub…" },
      { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring" },
      { href: "/team", label: "Team", icon: TbUsers, motion: "lift" },
      { href: "/affiliates", label: "Affiliates", icon: TbSparkles, motion: "sparkle", hint: "Earn credits" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: TbSettings, motion: "spin" },
      { href: "/plans", label: "Plans & credits", icon: TbSparkles, motion: "grow" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/home";
  if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
  return pathname === href || pathname.startsWith(href + "/");
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
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const title = React.useMemo(() => {
    for (const g of GROUPS) {
      for (const item of g.items) {
        if (isActive(pathname, item.href)) return item.label;
      }
    }
    return "Trove";
  }, [pathname]);

  const credits =
    balance && typeof balance.remaining === "number" ? balance.remaining : null;

  return (
    <div className="mobile-shell flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line/80 bg-canvas/90 px-2 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/75">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="group grid h-11 w-11 place-items-center rounded-full text-ink transition active:bg-hover"
        >
          <Ico icon={FiMenu} motion="menu" size={20} className="text-ink" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</p>
        </div>

        <button
          type="button"
          aria-label="New chat"
          onClick={() => router.push("/chat")}
          className="group grid h-11 w-11 place-items-center rounded-full text-ink transition active:bg-hover"
        >
          <Ico icon={FiPlus} motion="pop" size={20} className="text-ink" />
        </button>
      </header>

      <main className="mobile-shell-main min-h-0 flex-1 overflow-hidden">{children}</main>

      <nav
        className="mobile-bottom-nav sticky bottom-0 z-30 border-t border-line/80 bg-canvas/95 backdrop-blur-xl"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-3 gap-1 px-3 pt-1.5">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition",
                    active ? "text-ink" : "text-ink-4 active:bg-hover active:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-2xl transition",
                      active ? "bg-accent/15 text-accent" : "text-ink-3",
                    )}
                  >
                    <Ico
                      icon={item.icon}
                      motion={item.motion ?? "pop"}
                      size={20}
                      active={active}
                      className={active ? "text-accent" : "text-ink-3"}
                    />
                  </span>
                  <span className={cn("text-[11px] font-medium", active && "text-ink")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="nx-mobile-drawer flex h-full flex-col bg-rail">
          <div className="flex items-start gap-3 border-b border-line px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-[14px] font-bold text-white shadow-md">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[12.5px] text-ink-4">{user.email}</p>
              {credits != null ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-line bg-sunk px-2.5 py-0.5 text-[11.5px] tabular-nums text-ink-3">
                  <Ico icon={TbSparkles} motion="sparkle" size={12} className="text-accent" />
                  {credits.toLocaleString()} credits
                </span>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="group grid h-10 w-10 place-items-center rounded-full text-ink-3 transition active:bg-hover active:text-ink"
            >
              <Ico icon={FiX} motion="close" size={18} />
            </button>
          </div>

          <div className="px-3 pt-3">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/15 via-violet-500/10 to-sky-500/10 px-3.5 py-3 text-[14.5px] font-semibold text-ink shadow-sm transition active:scale-[0.98]"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-accent text-white">
                <Ico icon={FiPlus} motion="pop" size={18} className="text-white" />
              </span>
              New chat
            </Link>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            {GROUPS.map((g) => (
              <div key={g.label} className="mb-4">
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "group flex min-h-[48px] items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                            active
                              ? "bg-hover text-ink"
                              : "text-ink-2 active:bg-hover active:text-ink",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-xl transition",
                              active ? "bg-accent/15 text-accent" : "bg-sunk text-ink-3",
                            )}
                          >
                            <Ico
                              icon={item.icon}
                              motion={item.motion ?? "pop"}
                              size={18}
                              active={active}
                              className={active ? "text-accent" : undefined}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14.5px] font-medium leading-tight">
                              {item.label}
                            </span>
                            {item.hint ? (
                              <span className="block text-[11.5px] text-ink-4">{item.hint}</span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-line px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="group flex min-h-[44px] items-center gap-3 rounded-2xl px-3 py-2 text-[13.5px] text-ink-3 transition active:bg-hover active:text-ink"
            >
              <Ico icon={FiLogOut} motion="exit" size={17} />
              Account & preferences
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
