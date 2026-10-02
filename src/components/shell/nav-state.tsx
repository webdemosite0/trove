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
  const [open, setOpen] = useState(false);
  // Always start expanded on the server so SSR matches the first client paint.
  // After mount, restore the saved preference.
  const [collapsed, setCollapsedState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsedState(true);
      if (saved === "0") setCollapsedState(false);
    } catch {
      /* ignore */
    }
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
      collapsed: ready ? collapsed : false,
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
