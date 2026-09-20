import type { Metadata } from "next";
import { Backdrop } from "@/components/shell/backdrop";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import { isMobile } from "@/lib/device";
import { MobileShell } from "@/components/mobile/shell";
import { MobileViewport } from "@/components/mobile/viewport";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The tool layout: the same chrome as the rest of the workspace.
 *
 * This group used to render full-bleed, on the reasoning that a builder is a
 * workspace rather than a page inside one. That holds for the moment a build
 * is actually running and the preview wants every pixel — but it also took the
 * navigation away from the library screens that live at these paths, so
 * Documents and Research were the only places in the app you could not get to
 * Agents from. They carry the rail now, like everything else.
 *
 * The group still exists rather than being folded into (shell): the routes
 * under it are the ones that open a full-bleed editor, and keeping them
 * grouped is what lets that editor take the screen back later without moving
 * every URL.
 *
 * The auth gate is the same one the shell uses — see components/shell/guard.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  if (await isMobile()) {
    return (
      <ToastProvider>
        <Backdrop />
        <MobileShell
          user={{ name: user.name, email: user.email }}
          balance={balance}
        >
          {children}
        </MobileShell>
      </ToastProvider>
    );
  }

  const [due, recents] = await Promise.all([
    countDueReminders(),
    listAllRecents(6),
  ]);

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette recents={recents} />
        <MobileViewport />
        <div className="mobile-viewport flex h-dvh min-h-0 overflow-hidden">
          <Sidebar user={user} balance={balance} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
