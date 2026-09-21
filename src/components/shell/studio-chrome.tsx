"use client";

import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/shell/command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { MobileViewport } from "@/components/mobile/viewport";
import type { User, Balance } from "@/lib/types";
import type { Recent } from "@/lib/recents";

export function StudioChrome({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [meta, setMeta] = useState<{
    due: number;
    recents: Recent[];
    balance: Balance | null;
  }>({
    due: 0,
    recents: [],
    balance: null,
  });

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = () => {
      controller?.abort();
      controller = new AbortController();

      void fetch("/api/shell-meta", {
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
          setMeta({
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
  }, []);

  return (
    <>
      <CommandPalette recents={meta.recents} />
      <MobileViewport />
      <div className="mobile-viewport flex h-dvh min-h-0 overflow-hidden">
        <Sidebar user={user} balance={meta.balance} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            initial={user.name?.slice(0, 1)}
            due={meta.due}
            balance={meta.balance}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </>
  );
}
