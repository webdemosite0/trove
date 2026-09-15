"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FiMonitor, FiMoon, FiSun } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "nx-theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="system"){delete document.documentElement.dataset.theme}else{document.documentElement.dataset.theme=(t==="dark")?"dark":"light"}}catch(e){document.documentElement.dataset.theme="light"}})()`;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

const OPTIONS: { value: Theme; label: string; icon: typeof FiSun }[] = [
  { value: "light", label: "Light", icon: FiSun },
  { value: "dark", label: "Dark", icon: FiMoon },
  { value: "system", label: "System", icon: FiMonitor },
];

export const THEME_OPTIONS = OPTIONS;

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* session still applies */
    }
    emit();
  }, []);

  return [theme, choose];
}

/** Segmented light / dark / system switch — pill track, clear active chip. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, choose] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-sunk/80 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-all duration-[var(--t-hover)]",
              active
                ? "bg-raised text-ink shadow-sm shadow-black/5"
                : "text-ink-4 hover:text-ink-2",
            )}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
