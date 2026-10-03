import "server-only";
import { headers } from "next/headers";

/**
 * True when the request comes from the Trove Desktop (Electron) shell.
 * Electron includes "Electron" in its user-agent by default.
 */
export async function isDesktopShell(): Promise<boolean> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (/Electron/i.test(ua)) return true;
  // Optional override for local QA: ?desktop=1 with matching cookie set by the shell
  const cookie = h.get("cookie") ?? "";
  if (/(?:^|;\s*)trove_desktop=1(?:;|$)/.test(cookie)) return true;
  return false;
}
