"use client";

import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";

/** Opens the settings overlay from a server component. */
export function OpenSettingsButton({
  section = "general",
  className,
  children,
}: {
  section?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openSettings } = useNav();
  return (
    <button
      type="button"
      onClick={() => openSettings(section)}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
