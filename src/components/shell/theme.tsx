"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FiMoon, FiSun } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";
export const THEME_KEY = "nx-theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=(t==="dark"||t==="light")?t:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){document.documentElement.dataset.theme="light";document.documentElement.style.colorScheme="light"}})()`;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getSnapshot(): Theme {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === "light" || theme === "dark" ? theme : systemTheme();
  } catch {
    return systemTheme();
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

const OPTIONS: { value: Theme; label: string; icon: typeof FiSun }[] = [
  { value: "light", label: "Light Mode", icon: FiSun },
  { value: "dark", label: "Dark Mode", icon: FiMoon },
];

export const THEME_OPTIONS = OPTIONS;

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.dataset.theme = next;
    root.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* The current tab still applies the selection. */
    }
    emit();
  }, []);

  return [theme, choose];
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, choose] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Light Mode or Dark Mode"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-sunk/80 p-0.5 shadow-[inset_0_1px_0_var(--bezel)]",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => choose(option.value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-all duration-[var(--t-hover)]",
              active
                ? "bg-raised text-ink shadow-[var(--sh-1)] ring-1 ring-line"
                : "text-ink-4 hover:bg-hover hover:text-ink-2",
            )}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
