"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "@/components/ui/icons";
import {
  FiActivity,
  FiBriefcase,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiGrid,
  FiShield,
  FiSun,
  FiUser,
  FiUsers,
  TbHelpCircle,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Section {
  href: string;
  label: string;
  description: string;
  icon: IconType;
  away?: boolean;
  tone?: "violet" | "sky" | "emerald" | "amber" | "rose";
}

const ACCOUNT: Section[] = [
  { href: "/settings", label: "Profile", description: "Name and identity", icon: FiUser, tone: "sky" },
  { href: "/settings/business", label: "Business", description: "Company context for AI", icon: FiBriefcase, tone: "violet" },
  { href: "/settings/account", label: "Security", description: "Sign-in and account controls", icon: FiShield, tone: "emerald" },
  { href: "/settings/instructions", label: "AI instructions", description: "Personal preferences and rules", icon: FiFileText, tone: "violet" },
];

const EXPERIENCE: Section[] = [
  { href: "/settings/appearance", label: "Light & Dark Mode", description: "Theme and appearance", icon: FiSun, tone: "amber" },
  { href: "/settings/download", label: "Download app", description: "Windows, macOS, Android, iOS", icon: FiDownload, tone: "sky" },
  { href: "/settings/support", label: "Help & support", description: "Support, status, security", icon: TbHelpCircle, tone: "emerald" },
];

const BILLING: Section[] = [
  { href: "/settings/subscription", label: "Plan & subscription", description: "Plan and renewal", icon: FiCreditCard, tone: "violet" },
  { href: "/settings/payment-methods", label: "Payment methods", description: "Cards and billing method", icon: FiCreditCard, tone: "sky" },
  { href: "/settings/billing", label: "Billing history", description: "Invoices and payments", icon: FiFileText, tone: "amber" },
  { href: "/settings/usage", label: "Usage", description: "Credits and activity", icon: FiActivity, tone: "emerald" },
];

const WORKSPACE: Section[] = [
  { href: "/team", label: "Team workspace", description: "Members, roles, shared work", icon: FiUsers, away: true, tone: "violet" },
  { href: "/integrations", label: "Apps & integrations", description: "Connected company tools", icon: FiGrid, away: true, tone: "sky" },
  { href: "/projects", label: "Projects", description: "Cloud and shared projects", icon: FiGrid, away: true, tone: "emerald" },
];

const TONES: Record<NonNullable<Section["tone"]>, string> = {
  violet: "from-violet-500/18 to-fuchsia-500/8 text-violet-600 dark:text-violet-300",
  sky: "from-sky-500/18 to-cyan-500/8 text-sky-600 dark:text-sky-300",
  emerald: "from-emerald-500/18 to-teal-500/8 text-emerald-600 dark:text-emerald-300",
  amber: "from-amber-500/18 to-orange-500/8 text-amber-700 dark:text-amber-300",
  rose: "from-rose-500/18 to-pink-500/8 text-rose-600 dark:text-rose-300",
};

function SettingsSection({ title, items }: { title: string; items: Section[] }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-2 hidden items-center gap-2 px-2 lg:flex">
        <span className="h-px flex-1 bg-line" />
        <p className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-4">
          {title}
        </p>
        <span className="h-px flex-1 bg-line" />
      </div>

      <ul className="flex gap-1.5 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/settings" && pathname.startsWith(item.href + "/"));
          const tone = TONES[item.tone || "violet"];

          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-10 items-center gap-2.5 overflow-hidden rounded-[14px] border px-2.5 py-2 text-left transition-all lg:min-h-[54px]",
                  active
                    ? "border-line-strong bg-raised shadow-[var(--sh-1)]"
                    : "border-transparent text-ink-3 hover:border-line hover:bg-hover/70 hover:text-ink",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-violet-500 via-fuchsia-500 to-sky-500"
                  />
                ) : null}

                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br transition",
                    active ? tone : "from-sunk to-sunk text-ink-4 group-hover:text-ink",
                  )}
                >
                  <item.icon size={14} />
                </span>

                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-[12.5px]",
                      active ? "font-semibold text-ink" : "font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-[10.5px] text-ink-4 lg:block">
                    {item.description}
                  </span>
                </span>

                {item.away ? (
                  <span aria-hidden className="ml-auto hidden text-[10px] text-ink-4 lg:inline">
                    ↗
                  </span>
                ) : null}
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
    <nav aria-label="Settings sections" className="space-y-5 lg:w-full">
      <SettingsSection title="Account" items={ACCOUNT} />
      <SettingsSection title="Experience" items={EXPERIENCE} />
      <SettingsSection title="Billing" items={BILLING} />
      <SettingsSection title="Workspace" items={WORKSPACE} />
    </nav>
  );
}
