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
  FiMenu,
  FiX,
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
      { href: "/research", label: "Research", icon: TbSearch },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/home", label: "Home", icon: TbHome },
      { href: "/chat", label: "Chat", icon: TbMessageCircle },
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected },
      { href: "/reminders", label: "Reminders", icon: TbBell },
      { href: "/settings", label: "Settings", icon: TbSettings },
    ],
  },
];

export function MobileShell({
  children,
  balance = null,
}: {
  children: React.ReactNode;
  balance?: Balance | null;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col lg:hidden">
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-canvas/90 px-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-[var(--r-control)] text-ink hover:bg-hover"
        >
          <FiMenu size={20} />
        </button>
        <Link href="/home" className="text-[15px] font-semibold tracking-tight text-ink">
          Trove
        </Link>
        <span className="flex-1" />
      </header>

      <div className="min-h-0 flex-1">{children}</div>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="relative z-10 flex h-full w-[min(86vw,300px)] flex-col border-r border-line bg-rail shadow-xl">
            <div className="flex h-12 items-center justify-between border-b border-line px-3">
              <span className="text-[14px] font-semibold text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[var(--r-chip)] text-ink hover:bg-hover"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {GROUPS.map((g) => (
                <div key={g.label} className="mb-4">
                  <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    {g.label}
                  </p>
                  <ul className="space-y-0.5">
                    {g.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition",
                              active
                                ? "bg-hover font-medium text-ink"
                                : "text-ink-2 hover:bg-hover hover:text-ink",
                            )}
                          >
                            <Icon size={17} strokeWidth={2.25} className="text-ink" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
