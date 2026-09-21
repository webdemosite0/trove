import type { Metadata } from "next";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { AppChrome } from "@/components/shell/app-chrome";
import { AuthReferralAnnouncement } from "@/components/shell/auth-referral-announcement";
import { balanceFor } from "@/lib/credits";
import type { Balance } from "@/lib/types";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const list = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (gate.ok === false) return gate.screen;

  const user = gate.user;

  let balance: Balance | null = null;
  try {
    balance = await balanceFor(user.id, user.plan, { email: user.email });
  } catch {
    balance = null;
  }

  if (await isMobile()) {
    return (
      <ToastProvider>
        <Backdrop />
        <AuthReferralAnnouncement />
        <MobileShell
          user={{ name: user.name, email: user.email }}
          balance={balance}
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
          balance={balance}
          isAdmin={isAdminEmail(user?.email)}
        >
          {children}
        </AppChrome>
      </ToastProvider>
    </NavProvider>
  );
}
