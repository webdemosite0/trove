"use client";

import { useEffect } from "react";
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

  return (
    <SettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      user={user}
      balance={balance}
      initialSection={settingsSection}
      integrations={integrations}
      settingsData={settingsData}
    />
  );
}
