import type { Metadata } from "next";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import { AllWorkSection } from "@/components/work/all-work-section";
import { AllWorkVisibility } from "@/components/work/all-work-visibility";

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
        <div className="flex min-h-screen">
          <Sidebar user={user} balance={balance} isAdmin={isAdminEmail(user?.email)} />
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            <AnnouncementBanner />
            <div className="app-page-in min-w-0 flex-1">
              {children}
              <AllWorkVisibility>
                <AllWorkSection limit={18} />
              </AllWorkVisibility>
            </div>
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
