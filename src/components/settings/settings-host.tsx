"use client";

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
  const { settingsOpen, setSettingsOpen, settingsSection } = useNav();
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
