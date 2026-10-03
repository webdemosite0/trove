"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const COLLAPSE_KEY = "trove-rail-collapsed";

type NavCtx = {
  /** Mobile drawer open */
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Desktop rail collapsed to icons */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  settingsSection: string | null;
  openSettings: (section?: string) => void;
};

const NavContext = createContext<NavCtx | null>(null);

export function useNav(): NavCtx {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNav must be used inside NavProvider");
  }
  return ctx;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === "1") setCollapsedState(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const openSettings = useCallback((section?: string) => {
    setSettingsSection(section ?? null);
    setSettingsOpen(true);
  }, []);

  const value = useMemo<NavCtx>(
    () => ({
      open,
      setOpen,
      collapsed: hydrated ? collapsed : false,
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
      hydrated,
      setCollapsed,
      toggleCollapsed,
      settingsOpen,
      settingsSection,
      openSettings,
    ],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
