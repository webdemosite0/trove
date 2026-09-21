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
 * Balance is loaded client-side by StudioChrome /api/shell-meta, so this
 * layout only needs the authenticated user from the shell gate.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await sequentially so TS can narrow the ShellGate discriminant reliably.
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const user = gate.user;

  if (await isMobile()) {
    return (
      <ToastProvider>
        <Backdrop />
        <MobileShell user={{ name: user.name, email: user.email }} balance={null}>
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
