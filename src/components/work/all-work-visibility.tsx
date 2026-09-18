"use client";

import { usePathname } from "next/navigation";

export function AllWorkVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The Projects page renders the full library itself. Everywhere else gets
  // the compact library footer automatically.
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return null;

  return <>{children}</>;
}
