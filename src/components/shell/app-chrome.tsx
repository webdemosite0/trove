"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  isAdmin: _isAdmin,
  children,
}: {
  user: User;
  balance: Balance | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const isTeam = pathname === "/team" || pathname.startsWith("/team/");
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const [shellMeta, setShellMeta] = useState<{
    due: number;
    recents: Recent[];
    balance: Balance | null;
  }>({
    due: 0,
    recents: [],
    balance,
  });

  useEffect(() => {
    if (isTeam) return;

    let controller: AbortController | null = null;

    const load = () => {
      controller?.abort();
      controller = new AbortController();

      void fetch(isChat ? "/api/shell-meta?only=balance" : "/api/shell-meta", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as {
            due?: number;
            recents?: Recent[];
            balance?: Balance | null;
          };
        })
        .then((data) => {
          if (!data) return;
          setShellMeta({
            due: Number(data.due) || 0,
            recents: Array.isArray(data.recents) ? data.recents : [],
            balance: data.balance ?? null,
          });
        })
        .catch(() => null);
    };

    load();
    window.addEventListener("trove:shell-meta-refresh", load);
    return () => {
      controller?.abort();
      window.removeEventListener("trove:shell-meta-refresh", load);
    };
  }, [isChat, isTeam]);

  if (isTeam) {
    return <>{children}</>;
  }

  if (isSettings) {
    return (
      <>
        <CommandPalette recents={shellMeta.recents} />
        <div className="relative min-h-screen bg-canvas">
          <AuthReferralAnnouncement />
          <div className="app-page-in min-w-0">{children}</div>
        </div>
      </>
    );
  }

  return (
    <div
      className={
        isChat
          ? "flex h-dvh min-h-0 overflow-hidden"
          : "flex min-h-screen"
      }
    >
      <CommandPalette recents={shellMeta.recents} />
      <Sidebar user={user} balance={shellMeta.balance} />
      <main
        className={
          isChat
            ? "relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : "relative flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        <AuthReferralAnnouncement />
        <TopBar
          initial={user?.name?.slice(0, 1)}
          due={shellMeta.due}
          balance={shellMeta.balance}
        />
        <AnnouncementBanner />
        <div
          className={
            isChat
              ? "app-page-in min-h-0 min-w-0 flex-1 overflow-hidden"
              : "app-page-in min-w-0 flex-1"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
