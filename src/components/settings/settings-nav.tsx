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

const ACCOUNT: Section[] = [
  { href: "/settings", label: "Profile", icon: FiUser },
  { href: "/settings/account", label: "Account & security", icon: FiShield },
  { href: "/settings/appearance", label: "Appearance", icon: FiSun },
  { href: "/settings/instructions", label: "Instructions", icon: FiFileText },
];

const BILLING: Section[] = [
  { href: "/settings/subscription", label: "Plan & subscription", icon: FiCreditCard },
  { href: "/settings/payment-methods", label: "Payment methods", icon: FiCreditCard },
  { href: "/settings/billing", label: "Billing history", icon: FiFileText },
  { href: "/settings/usage", label: "Usage", icon: FiActivity },
];

const WORKSPACE: Section[] = [
  { href: "/team", label: "Team", icon: FiUsers, away: true },
  { href: "/integrations", label: "Apps", icon: FiGrid, away: true },
  { href: "/projects", label: "Projects", icon: FiGrid, away: true },
];

const SUPPORT: Section[] = [
  { href: "/help", label: "Help & support", icon: FiFileText, away: true },
];

function SettingsSection({ title, items }: { title: string; items: Section[] }) {
  const pathname = usePathname();
  return (
    <div>
      <p className="mb-2 hidden px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4 lg:block">
        {title}
      </p>
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
        {items.map((s) => {
          const active = pathname === s.href;
          return (
            <li key={s.href} className="shrink-0 lg:shrink">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all",
                  active
                    ? "bg-white font-medium text-ink shadow-[0_1px_3px_rgba(15,23,42,.08),0_8px_24px_rgba(15,23,42,.04)] ring-1 ring-black/[0.05]"
                    : "text-ink-3 hover:bg-white/70 hover:text-ink",
                )}
              >
                <s.icon size={15} className={cn("shrink-0", active ? "text-accent" : "text-ink-4")} />
                <span className="truncate">{s.label}</span>
                {s.away ? <span aria-hidden className="ml-auto hidden text-[11px] text-ink-4 lg:inline">↗</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SettingsNav() {
  return (
    <nav aria-label="Settings sections" className="space-y-5 lg:w-[220px] lg:shrink-0">
      <SettingsSection title="Account" items={ACCOUNT} />
      <SettingsSection title="Billing" items={BILLING} />
      <SettingsSection title="Workspace" items={WORKSPACE} />
      <SettingsSection title="Support" items={SUPPORT} />
    </nav>
  );
}
