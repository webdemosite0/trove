"use client";

import { SettingsModal } from "@/components/settings/settings-modal";
import { useNav } from "@/components/shell/nav-state";
import type { User, Balance } from "@/lib/types";

/** Mounts the settings overlay inside NavProvider (desktop shell). */
export function SettingsHost({
  user,
  balance,
}: {
  user: User | null;
  balance: Balance | null;
}) {
  const { settingsOpen, setSettingsOpen } = useNav();
  return (
    <SettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      user={user}
      balance={balance}
    />
  );
}
