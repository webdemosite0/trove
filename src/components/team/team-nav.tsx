"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiBriefcase,
  FiFolder,
  FiMail,
  FiSettings,
  FiUsers,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/team", label: "Overview", icon: FiUsers },
  { href: "/team/members", label: "Members", icon: FiUsers },
  { href: "/team/projects", label: "Projects", icon: FiFolder },
  { href: "/team/invites", label: "Invitations", icon: FiMail, adminOnly: true },
  { href: "/team/business", label: "Business", icon: FiBriefcase },
  { href: "/team/settings", label: "Settings", icon: FiSettings },
];

export function TeamNav({
  role,
}: {
  role?: "owner" | "admin" | "member" | null;
}) {
  const pathname = usePathname();
  const canAdmin = role === "owner" || role === "admin";

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-raised/85 p-1 shadow-[var(--sh-1)] scrollbar-none">
      {ITEMS.filter((item) => !item.adminOnly || canAdmin).map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/team" && pathname.startsWith(item.href + "/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-medium transition",
              active
                ? "bg-gradient-to-r from-violet-500/15 to-sky-500/15 text-ink shadow-sm"
                : "text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            <Icon size={13} className={active ? "text-accent" : "text-ink-4"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
