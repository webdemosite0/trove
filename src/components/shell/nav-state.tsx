"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Shell navigation state.
 *
 * `open` is the mobile drawer. `collapsed` is the desktop rail, lifted out of
 * Sidebar so a page can narrow the chrome when it needs the room — the builder
 * collapses it the moment a build starts, because at that point the preview is
 * the thing worth looking at and the nav is not.
 *
 * The rail starts collapsed (icons only, ChatGPT-style). Every destination
 * reads as a glyph; expanding is one tap on the rail toggle. The choice
 * persists in localStorage, so it survives page loads and sessions.
 */
const NavContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  /** Settings as an overlay dialog (not a full-page route). */
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  /** Which settings section the overlay opens to. */
  settingsSection: string | null;
  /** Open the settings overlay, optionally at a section ("integrations", "appearance", …). */
  openSettings: (section?: string) => void;
}>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  settingsOpen: false,
  setSettingsOpen: () => {},
  settingsSection: null,
  openSettings: () => {},
});

export const useNav = () => useContext(NavContext);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // ChatGPT-style: the rail starts collapsed (icons only). Expand is one tap away.
  // The choice persists in localStorage so it survives page loads.
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("trove-sidebar-collapsed");
    return saved === null ? true : saved === "1";
  });
  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem("trove-sidebar-collapsed", v ? "1" : "0");
    } catch {
      /* storage unavailable — session-only */
    }
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  const openSettings = (section?: string) => {
    setSettingsSection(section ?? null);
    setSettingsOpen(true);
  };

  const value = useMemo(
    () => ({
      open,
      setOpen,
      collapsed,
      setCollapsed,
      settingsOpen,
      setSettingsOpen,
      settingsSection,
      openSettings,
    }),
    [open, collapsed, settingsOpen, settingsSection],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
