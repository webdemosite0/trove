import type { Metadata } from "next";
import { Backdrop } from "@/components/shell/backdrop";
import { NavProvider } from "@/components/shell/nav-state";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { isMobile } from "@/lib/device";
import { MobileShell } from "@/components/mobile/shell";
import { StudioChrome } from "@/components/shell/studio-chrome";

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
  const [gate, mobile] = await Promise.all([resolveShell(), isMobile()]);
  if (!gate.ok) return gate.screen;
  const { user } = gate;

  if (mobile) {
    return (
      <ToastProvider>
        <Backdrop />
        <MobileShell
          user={{ name: user.name, email: user.email }}
          balance={null}
        >
          {children}
        </MobileShell>
      </ToastProvider>
    );
  }

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <StudioChrome user={user}>{children}</StudioChrome>
      </ToastProvider>
    </NavProvider>
  );
}
