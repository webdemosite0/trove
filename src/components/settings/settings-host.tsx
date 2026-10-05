"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SettingsModal, type IntegrationsData, type SettingsData } from "@/components/settings/settings-modal";
import { useNav } from "@/components/shell/nav-state";
import type { User, Balance } from "@/lib/types";

/** Mounts the settings overlay inside NavProvider (desktop shell). */
export function SettingsHost({
  user,
  balance,
  integrations,
  settingsData,
}: {
  user: User | null;
  balance: Balance | null;
  integrations?: IntegrationsData;
  settingsData?: SettingsData;
}) {
  const { settingsOpen, setSettingsOpen, settingsSection, openSettings } = useNav();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ?settings=tros (or any section) opens the modal on that tab
  useEffect(() => {
    const section = searchParams.get("settings");
    if (!section) return;
    openSettings(section);
    // Strip the query so refresh doesn't re-open forever
    const params = new URLSearchParams(searchParams.toString());
    params.delete("settings");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, openSettings, router, pathname]);

  // Defect 3 (P2): the studio (creation-route) layout mounts this host without
  // the account payload the shell layout fetches server-side, which made the
  // dialog show "Sign in to edit your profile" to a signed-in user and report
  // a different token balance than the chat routes. Fetch the missing pieces
  // from the same sources instead:
  //   - /api/settings/data  — profile/business/instructions/subscription
  //   - /api/shell-meta?only=balance — credits, via balanceFor, the single
  //     source of truth every other surface (TopBar meter, StudioChrome,
  //     mobile shell) already reads.
  // Until each fetch settles the modal receives `undefined` for that piece and
  // renders a loading skeleton — never the signed-out fallback. A settled
  // fetch that came back empty collapses back to the prop so the modal renders
  // its normal fallback instead of spinning forever.
  const needsSettings = user !== null && settingsData === undefined;
  const needsBalance = user !== null && balance === null;
  const [remote, setRemote] = useState<{
    settings?: SettingsData;
    settingsFailed: boolean;
    balance?: Balance | null;
    balanceFailed: boolean;
  }>({ settingsFailed: false, balanceFailed: false });

  useEffect(() => {
    if (!needsSettings) return;
    let cancelled = false;
    void fetch("/api/settings/data", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<SettingsData>) : null))
      .then((data) => {
        if (cancelled) return;
        setRemote((r) => ({
          ...r,
          settings: data ?? undefined,
          settingsFailed: !data,
        }));
      })
      .catch(() => {
        if (!cancelled) setRemote((r) => ({ ...r, settingsFailed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [needsSettings]);

  useEffect(() => {
    if (!needsBalance) return;
    let cancelled = false;
    void fetch("/api/shell-meta?only=balance", { cache: "no-store" })
      .then((res) =>
        res.ok ? (res.json() as Promise<{ balance?: Balance | null }>) : null,
      )
      .then((data) => {
        if (cancelled) return;
        setRemote((r) => ({
          ...r,
          balance: data ? data.balance ?? null : undefined,
          balanceFailed: !data,
        }));
      })
      .catch(() => {
        if (!cancelled) setRemote((r) => ({ ...r, balanceFailed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [needsBalance]);

  return (
    <SettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      user={user}
      balance={balance ?? (needsBalance ? (remote.balanceFailed ? null : remote.balance) : null)}
      initialSection={settingsSection}
      integrations={integrations}
      settingsData={settingsData ?? remote.settings}
      settingsLoadFailed={needsSettings && remote.settingsFailed}
    />
  );
}
