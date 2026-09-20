import type { Metadata } from "next";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import { AppChrome } from "@/components/shell/app-chrome";

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
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  const [due, recents] = await Promise.all([
    countDueReminders(),
    listAllRecents(6),
  ]);

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

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette recents={recents} />
        <AppChrome
          user={user}
          balance={balance}
          due={due}
          isAdmin={isAdminEmail(user?.email)}
        >
          {children}
        </AppChrome>
      </ToastProvider>
    </NavProvider>
  );
}
