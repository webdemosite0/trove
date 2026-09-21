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

/** Studio routes share shell auth; credits load client-side via /api/shell-meta. */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (gate.ok === false) return gate.screen;

  const user = gate.user;
  const mobile = await isMobile();

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
