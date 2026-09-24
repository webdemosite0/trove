import type { Metadata } from "next";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { AppChrome } from "@/components/shell/app-chrome";
import { AuthReferralAnnouncement } from "@/components/shell/auth-referral-announcement";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (gate.ok === false) return gate.screen;

  const user = gate.user;

  if (await isMobile()) {
    return (
      <ToastProvider>
        <Backdrop />
        <AuthReferralAnnouncement />
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
        <AppChrome
          user={user}
          balance={null}
          isAdmin={isAdminEmail(user?.email)}
        >
          {children}
        </AppChrome>
      </ToastProvider>
    </NavProvider>
  );
}
