"use client";

import { usePathname } from "next/navigation";

export function AllWorkVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Full-screen workspaces: no library strip under the editor.
  if (
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/websites" ||
    pathname.startsWith("/websites/") ||
    pathname.startsWith("/project/")
  ) {
    return null;
  }

  return <>{children}</>;
}
