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
  TbSparkles,
  FiFolder,
  FiChevronRight,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { Drawer } from "@/components/mobile/drawer";
import { cn } from "@/lib/utils";
import type { Balance } from "@/lib/types";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";

type Dest = {
  href: string;
  label: string;
  icon: IconType;
  motion?: Motion;
  hint?: string;
};

const GROUPS: { label: string; items: Dest[] }[] = [
  {
    label: "Work",
    items: [
      { href: "/chat", label: "Chat", icon: TbMessageCircle, motion: "lift", hint: "Ask, build, and edit" },
      { href: "/projects", label: "Projects", icon: FiFolder, motion: "open", hint: "Cloud and local work" },
      { href: "/dashboard", label: "Home", icon: TbHome, motion: "pop", hint: "Recent work and shortcuts" },
    ],
  },
  {
    label: "Create",
    items: [
      { href: "/documents", label: "Documents", icon: TbFileText, motion: "type", hint: "Docs and briefs" },
      { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable, motion: "stack", hint: "Tables and data" },
      { href: "/slides", label: "Slides", icon: TbPresentation, motion: "grow", hint: "Presentations" },
      { href: "/design", label: "Design", icon: TbPalette, motion: "hue", hint: "Interfaces and visuals" },
      { href: "/agents", label: "Agents", icon: TbRobot, motion: "spin", hint: "Multi-step work" },
      { href: "/research", label: "Research", icon: TbSearch, motion: "scan", hint: "Deep answers" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected, motion: "nudge", hint: "Slack, GitHub, and more" },
      { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring", hint: "Follow-ups" },
      { href: "/team", label: "Team", icon: TbUsers, motion: "lift", hint: "Shared workspace" },
      { href: "/settings/business", label: "Business profile", icon: TbSparkles, motion: "sparkle", hint: "Company context for AI" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: TbSettings, motion: "spin", hint: "Account and preferences" },
      { href: "/plans", label: "Plans & credits", icon: TbSparkles, motion: "grow", hint: "Usage and billing" },
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
  const [liveBalance, setLiveBalance] = React.useState<Balance | null>(balance);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    let controller: AbortController | null = null;
    const loadBalance = () => {
      controller?.abort();
      controller = new AbortController();
      void fetch("/api/shell-meta?only=balance", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) => (res.ok ? ((await res.json()) as { balance?: Balance | null }) : null))
        .then((data) => data && setLiveBalance(data.balance ?? null))
        .catch(() => null);
    };
    loadBalance();
    window.addEventListener("trove:shell-meta-refresh", loadBalance);
    return () => {
      controller?.abort();
      window.removeEventListener("trove:shell-meta-refresh", loadBalance);
    };
  }, []);

  const activeItem = React.useMemo(() => {
    for (const group of GROUPS) {
      for (const item of group.items) {
        if (isActive(pathname, item.href)) return item;
      }
    }
    return null;
  }, [pathname]);

  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const title = isChat ? "Trove" : activeItem?.label || "Trove";
  const credits =
    liveBalance && typeof liveBalance.remaining === "number"
      ? liveBalance.remaining
      : null;

  return (
    <div className="mobile-shell flex min-h-dvh flex-col bg-canvas text-ink">
      <header
        className="mobile-shell-header sticky top-0 z-40 flex items-center gap-2 border-b border-line/55 bg-canvas/82 px-2.5 backdrop-blur-2xl"
        style={{
          minHeight: "calc(54px + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
        >
          <Ico icon={FiMenu} motion="menu" size={20} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {isChat ? <TroveOrb size={24} /> : null}
          <span className="truncate text-[14.5px] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </span>
        </div>

        <button
          type="button"
          aria-label="New chat"
          onClick={() => router.push("/chat")}
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-95 active:bg-hover"
        >
          <Ico icon={FiPlus} motion="pop" size={20} />
        </button>
      </header>

      <main className="mobile-shell-main min-h-0 flex-1 overflow-hidden">{children}</main>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="nx-mobile-drawer flex h-full flex-col bg-rail">
          <div
            className="border-b border-line/70 px-4 pb-4"
            style={{ paddingTop: "max(18px, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 text-[13px] font-bold text-white shadow-[0_10px_28px_-12px_var(--btn-glow)]">
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[11.5px] text-ink-4">{user.email}</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full text-ink-4 transition active:bg-hover active:text-ink"
              >
                <FiX size={18} />
              </button>
            </div>

            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="mt-4 flex min-h-12 items-center gap-3 rounded-[16px] border border-violet-400/20 bg-gradient-to-r from-violet-500/12 via-fuchsia-500/8 to-sky-500/10 px-3.5 text-[13.5px] font-semibold text-ink shadow-[var(--sh-1)] active:scale-[0.99]"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 text-white">
                <FiPlus size={16} />
              </span>
              New chat
            </Link>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-none">
            {GROUPS.map((group) => (
              <section key={group.label} className="mb-5">
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex min-h-[52px] items-center gap-3 rounded-[15px] px-2.5 py-2.5 transition active:scale-[0.99]",
                            active
                              ? "bg-gradient-to-r from-violet-500/10 to-sky-500/8 text-ink"
                              : "text-ink-2 active:bg-hover",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-xl",
                              active
                                ? "bg-gradient-to-br from-violet-500/18 to-sky-500/15 text-accent"
                                : "bg-sunk text-ink-3",
                            )}
                          >
                            <Ico
                              icon={item.icon}
                              motion={item.motion ?? "pop"}
                              active={active}
                              size={18}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium">{item.label}</span>
                            {item.hint ? (
                              <span className="mt-0.5 block truncate text-[10.5px] text-ink-4">
                                {item.hint}
                              </span>
                            ) : null}
                          </span>
                          <FiChevronRight size={14} className="shrink-0 text-ink-4" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>

          <div
            className="border-t border-line/70 px-4 pt-3"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between rounded-[16px] bg-sunk/70 px-3.5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <TroveOrb size={20} />
                  <Wordmark size={14} />
                </div>
                <p className="mt-1 text-[10.5px] text-ink-4">AI workspace for business</p>
              </div>
              {credits != null ? (
                <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-[10.5px] font-semibold tabular-nums text-ink-3">
                  {credits.toLocaleString()} cr
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
