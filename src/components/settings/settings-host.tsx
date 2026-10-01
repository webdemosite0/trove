"use client";

import { SettingsModal, type IntegrationsData } from "@/components/settings/settings-modal";
import { useNav } from "@/components/shell/nav-state";
import type { User, Balance } from "@/lib/types";

/** Mounts the settings overlay inside NavProvider (desktop shell). */
export function SettingsHost({
  user,
  balance,
  integrations,
}: {
  user: User | null;
  balance: Balance | null;
  integrations?: IntegrationsData;
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
    />
  );
}
