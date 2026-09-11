"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiUser,
  FiShield,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiGrid,
  FiSun,
  FiFileText,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Section {
  href: string;
  label: string;
  icon: IconType;
  away?: boolean;
}

const SECTIONS: Section[] = [
  { href: "/settings", label: "Profile", icon: FiUser },
  { href: "/settings/instructions", label: "Instructions", icon: FiFileText },
  { href: "/settings/account", label: "Account", icon: FiShield },
  { href: "/settings/appearance", label: "Appearance", icon: FiSun },
  { href: "/settings/usage", label: "Usage", icon: FiActivity },
  { href: "/plans", label: "Plan", icon: FiCreditCard, away: true },
  { href: "/team", label: "Team", icon: FiUsers, away: true },
  { href: "/integrations", label: "Apps", icon: FiGrid, away: true },
  { href: "/projects", label: "Projects", icon: FiGrid, away: true },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="lg:w-[212px] lg:shrink-0">
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
        {SECTIONS.map((s) => {
          const active = pathname === s.href;
          return (
            <li key={s.href} className="shrink-0 lg:shrink">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-hover font-medium text-ink"
                    : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <s.icon
                  size={15}
                  className={cn("shrink-0", active ? "text-accent" : "text-ink-4")}
                />
                <span className="truncate">{s.label}</span>
                {s.away ? (
                  <span
                    aria-hidden
                    className="ml-auto hidden text-[11px] text-ink-4 lg:inline"
                  >
                    ↗
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
