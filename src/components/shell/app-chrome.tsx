"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft } from "@/components/ui/icons";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import type { User, Balance } from "@/lib/types";

export function AppChrome({
  user,
  balance,
  due,
  isAdmin,
  children,
}: {
  user: User;
  balance: Balance | null;
  due: number;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  if (isSettings) {
    return (
      <div className="min-h-screen bg-canvas">
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
      <Sidebar user={user} balance={balance} isAdmin={isAdmin} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar initial={user?.name?.slice(0, 1)} due={due} balance={balance} />
        <AnnouncementBanner />
        <div className="app-page-in min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
