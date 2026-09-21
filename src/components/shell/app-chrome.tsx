"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft } from "@/components/ui/icons";
import { Sidebar } from "@/components/shell/sidebar";
import { CommandPalette } from "@/components/shell/command-palette";
import { TopBar } from "@/components/shell/top-bar";
import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import { AuthReferralAnnouncement } from "@/components/shell/auth-referral-announcement";
import type { User, Balance } from "@/lib/types";
import type { Recent } from "@/lib/recents";

export function AppChrome({
  user,
  balance,
  isAdmin,
  children,
}: {
  user: User;
  balance: Balance | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const [shellMeta, setShellMeta] = useState<{ due: number; recents: Recent[] }>({
    due: 0,
    recents: [],
  });

  useEffect(() => {
    if (isSettings) return;
    const controller = new AbortController();

    void fetch("/api/shell-meta", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { due?: number; recents?: Recent[] };
      })
      .then((data) => {
        if (!data) return;
        setShellMeta({
          due: Number(data.due) || 0,
          recents: Array.isArray(data.recents) ? data.recents : [],
        });
      })
      .catch(() => null);

    return () => controller.abort();
  }, [isSettings]);

  if (isSettings) {
    return (
      <div className="relative min-h-screen bg-canvas">
        <AuthReferralAnnouncement />
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4 sm:px-6">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[14px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
            >
              <FiArrowLeft size={18} />
              Back
            </Link>
          </div>
        </header>
        <div className="app-page-in min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <CommandPalette recents={shellMeta.recents} />
      <Sidebar user={user} balance={balance} isAdmin={isAdmin} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <AuthReferralAnnouncement />
        <TopBar initial={user?.name?.slice(0, 1)} due={shellMeta.due} balance={balance} />
        <AnnouncementBanner />
        <div className="app-page-in min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
