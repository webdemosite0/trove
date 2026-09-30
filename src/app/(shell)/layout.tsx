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
import { SettingsHost } from "@/components/settings/settings-host";


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
  // Auth, database health and the ephemeral-storage refusal all live in the
  // guard, shared with the full-bleed layout so neither can drift open.
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  // One COUNT alongside the two queries the guard already runs. It is on every
  // navigation, so it stays a count — the reminders themselves are fetched by
  // the page that shows them.
  const [due, recents] = await Promise.all([
    countDueReminders(),
    listAllRecents(6),
  ]);

  // Two separate UIs, not one that reflows. The phone gets its own chrome —
  // tab bar, sheets, no rail — and never renders the desktop tree, so nothing
  // here can regress the desktop layout.
  if (await isMobile()) {
    return (
      <NavProvider>
        <ToastProvider>
          <Backdrop />
          <SettingsHost user={user} balance={balance} />
          <MobileShell
            user={{ name: user.name, email: user.email }}
            balance={balance}
          >
            {children}
          </MobileShell>
        </ToastProvider>
      </NavProvider>
    );
  }

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette recents={recents} />
        <SettingsHost user={user} balance={balance} />
        {/*
          Fixed viewport shell: sidebar stays put; only the main column scrolls.
          Split top chrome from the scrollport so long pages never get clipped.
        */}
        <div className="flex h-dvh max-h-dvh overflow-hidden">
          <Sidebar user={user} balance={balance} isAdmin={isAdminEmail(user?.email)} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            <AnnouncementBanner />
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
