"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiArrowLeft,
  FiBriefcase,
  FiChevronRight,
  FiFolder,
  FiMail,
  FiMenu,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

type TeamRole = "owner" | "admin" | "member";

const ITEMS = [
  {
    href: "/team",
    label: "Overview",
    description: "Workspace summary",
    icon: FiShield,
  },
  {
    href: "/team/members",
    label: "Members",
    description: "People & roles",
    icon: FiUsers,
  },
  {
    href: "/team/projects",
    label: "Projects",
    description: "Shared work",
    icon: FiFolder,
  },
  {
    href: "/team/invites",
    label: "Invitations",
    description: "Invite teammates",
    icon: FiMail,
    adminOnly: true,
  },
  {
    href: "/team/business",
    label: "Business",
    description: "Company context",
    icon: FiBriefcase,
  },
  {
    href: "/team/settings",
    label: "Settings",
    description: "Workspace controls",
    icon: FiSettings,
  },
] as const;

function roleLabel(role: TeamRole | null) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "member") return "Member";
  return "Team";
}

function TeamRail({
  teamName,
  role,
  onNavigate,
}: {
  teamName: string;
  role: TeamRole | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const canAdmin = role === "owner" || role === "admin";

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="group flex h-10 items-center gap-2 rounded-xl border border-line bg-raised/80 px-3 text-[12px] font-semibold text-ink-2 shadow-[var(--sh-1)] transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-ink"
        >
          <FiArrowLeft
            size={14}
            className="text-ink-4 transition group-hover:-translate-x-0.5 group-hover:text-violet-500 dark:group-hover:text-violet-300"
          />
          <span>Back to Trove</span>
        </Link>
      </div>

      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 ring-1 ring-violet-400/20">
            <TroveOrb size={25} />
          </span>
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
              Team workspace
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">
              {teamName || "Trove Team"}
            </p>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-violet-600 dark:text-violet-300">
          <FiShield size={11} />
          {roleLabel(role)}
        </div>
      </div>

      <div className="mx-3 h-px bg-line" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-4">
          Team features
        </p>
        {ITEMS.filter((item) => !item.adminOnly || canAdmin).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/team" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition",
                active
                  ? "bg-gradient-to-r from-violet-500/15 via-fuchsia-500/[0.08] to-sky-500/10 text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-violet)_18%,transparent)]"
                  : "text-ink-2 hover:bg-hover hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl transition",
                  active
                    ? "bg-raised text-violet-600 shadow-[var(--sh-1)] dark:text-violet-300"
                    : "bg-sunk/70 text-ink-4 group-hover:text-ink-2",
                )}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-ink-4">
                  {item.description}
                </span>
              </span>
              <FiChevronRight
                size={12}
                className={cn(
                  "shrink-0 transition",
                  active
                    ? "text-violet-500 dark:text-violet-300"
                    : "text-ink-4 opacity-0 group-hover:opacity-100",
                )}
              />
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center justify-between rounded-xl border border-line bg-sunk/55 px-3 py-2">
          <span className="text-[10.5px] font-medium text-ink-4">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function TeamShell({
  teamName,
  role,
  children,
}: {
  teamName: string;
  role: TeamRole | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-line bg-rail/92 shadow-[8px_0_32px_-28px_rgba(0,0,0,.35)] backdrop-blur-xl lg:block">
        <TeamRail teamName={teamName} role={role} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-canvas/88 px-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-10 place-items-center rounded-xl border border-line bg-raised text-ink-2"
          aria-label="Open Team navigation"
        >
          <FiMenu size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-ink">
            {teamName || "Team"}
          </p>
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
            Team workspace · {roleLabel(role)}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-raised px-2.5 text-[10.5px] font-semibold text-ink-2"
        >
          <FiArrowLeft size={12} />
          Trove
        </Link>
      </header>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close Team navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-[60] w-[min(86vw,300px)] border-r border-line bg-rail shadow-2xl lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg bg-sunk text-ink-3"
              aria-label="Close"
            >
              <FiX size={15} />
            </button>
            <TeamRail
              teamName={teamName}
              role={role}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </>
      ) : null}

      <main className="min-h-dvh lg:pl-[252px]">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
