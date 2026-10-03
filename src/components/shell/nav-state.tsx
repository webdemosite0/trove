"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "trove-sidebar-collapsed";

const NavContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  /** Stable toggle — never reads stale state. */
  toggleCollapsed: () => void;
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
  collapsed: true,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  settingsOpen: false,
  setSettingsOpen: () => {},
  settingsSection: null,
  openSettings: () => {},
});

export const useNav = () => useContext(NavContext);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // The rail starts collapsed (icons only). One tap expands.
  //
  // Hydration-safe: the server and the first client paint both render
  // collapsed=true, so they always agree.
  const [collapsed, setCollapsedState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  const openSettings = useCallback((section?: string) => {
    setSettingsSection(section ?? null);
    setSettingsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      collapsed: ready ? collapsed : true,
      setCollapsed,
      toggleCollapsed,
      settingsOpen,
      setSettingsOpen,
      settingsSection,
      openSettings,
    }),
    [
      open,
      collapsed,
      ready,
      setCollapsed,
      toggleCollapsed,
      settingsOpen,
      settingsSection,
      openSettings,
    ],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
