"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  TbMenu2,
  TbX,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Balance } from "@/lib/types";

type Dest = {
  href: string;
  label: string;
  icon: IconType;
};

const GROUPS: { label: string; items: Dest[] }[] = [
  {
    label: "Create",
    items: [
      { href: "/documents", label: "Documents", icon: TbFileText },
      { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable },
      { href: "/slides", label: "Slides", icon: TbPresentation },
      { href: "/design", label: "Design", icon: TbPalette },
      { href: "/agents", label: "Agents", icon: TbRobot },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: TbHome },
      { href: "/chat", label: "Chat", icon: TbMessageCircle },
      { href: "/research", label: "Research", icon: TbSearch },
      { href: "/team", label: "Team", icon: TbUsers },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected },
      { href: "/reminders", label: "Reminders", icon: TbBell },
      { href: "/settings", label: "Settings", icon: TbSettings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
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
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-rail/95 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-hover"
        >
          <TbMenu2 size={20} />
        </button>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">Trove</span>
        {balance ? (
          <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] tabular-nums text-ink-3">
            {balance.remaining}
          </span>
        ) : null}
      </header>

      <main className="min-h-0 flex-1">{children}</main>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] flex-col border-r border-line bg-rail shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[12px] text-ink-4">{user.email}</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-hover"
              >
                <TbX size={18} />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto p-3">
              {GROUPS.map((g) => (
                <div key={g.label} className="mb-4">
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    {g.label}
                  </p>
                  <ul className="space-y-0.5">
                    {g.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium",
                              active ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
                            )}
                          >
                            <Icon size={17} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
