"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Shell navigation state.
 *
 * `open` is the mobile drawer. `collapsed` is the desktop rail.
 * Collapse choice persists in localStorage.
 */
const NavContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  settingsSection: string | null;
  openSettings: (section?: string) => void;
}>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  settingsOpen: false,
  setSettingsOpen: () => {},
  settingsSection: null,
  openSettings: () => {},
});

export const useNav = () => useContext(NavContext);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem("trove-sidebar-collapsed");
      return saved === null ? true : saved === "1";
    } catch {
      return true;
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem("trove-sidebar-collapsed", v ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("trove-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const openSettings = useCallback((section?: string) => {
    setSettingsSection(section ?? null);
    setSettingsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      collapsed,
      setCollapsed,
      toggleCollapsed,
      settingsOpen,
      setSettingsOpen,
      settingsSection,
      openSettings,
    }),
    [open, setOpen, collapsed, setCollapsed, toggleCollapsed, settingsOpen, settingsSection, openSettings],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
