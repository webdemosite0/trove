import type { Metadata } from "next";
import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { Wordmark } from "@/components/brand/logo";
import { isMobile } from "@/lib/device";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import { SettingsHost } from "@/components/settings/settings-host";
import { listConnections } from "@/lib/connections";
import { composioConfigured, COMPOSIO_MAP } from "@/lib/composio";
import { connectableProviders } from "@/lib/providers";
import { getProfile } from "@/app/actions/profile";
import { getBusinessProfile } from "@/lib/business-profile";
import { getManualInstructions } from "@/lib/user-prefs";
import { subscriptionFor } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Authenticated app pages must never appear in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Focus ring for the anonymous build-entry chrome (theme tokens only). */
const focusRingCls =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";


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

  // Anonymous build entry (P4: build before signup, e.g. /tros/new). Minimal
  // public chrome — no sidebar, no user data — so a visitor can build before
  // creating an account. Authenticated visitors never take this branch.
  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas text-ink">
        <Backdrop />
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-8">
          <Link href="/" aria-label="Trove home" className={focusRingCls}>
            <Wordmark size={19} />
          </Link>
          <Link
            href="/login?next=/tros/new"
            className={cn(
              "rounded-xl border border-line bg-ink/[0.04] px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-ink/10",
              focusRingCls,
            )}
          >
            Log in
          </Link>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    );
  }

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
  const connections = user ? await listConnections().catch(() => []) : [];
  const integrations = {
    signedIn: Boolean(user),
    connected: connections.map((c) => ({
      service: c.service,
      account: c.account ?? "",
      hint: c.hint ?? "",
      grant: c.grant ?? null,
    })),
    connectable: connectableProviders(),
    composioOn: composioConfigured(),
    composioServices: composioConfigured() ? Object.keys(COMPOSIO_MAP) : [],
  };

  // Settings overlay data — the overlay replaces the old /settings pages, so
  // every feature those pages had (profile, business, instructions, billing)
  // is fetched once here and handed to the modal.
  const [profile, businessProfile, manualInstructions, subscription] = user
    ? await Promise.all([
        getProfile().catch(() => null),
        getBusinessProfile(user.id).catch(() => null),
        getManualInstructions(user.id).catch(() => ""),
        subscriptionFor(user.id).catch(() => null),
      ])
    : [null, null, "", null];
  const settingsData = { profile, businessProfile, manualInstructions, subscription };

  if (await isMobile()) {
    return (
      <NavProvider>
        <ToastProvider>
          <Backdrop />
          <SettingsHost user={user} balance={balance} integrations={integrations} settingsData={settingsData} />
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
        <SettingsHost user={user} balance={balance} integrations={integrations} settingsData={settingsData} />
        {/*
          Fixed viewport shell: sidebar stays put; only the main column scrolls.
          Split top chrome from the scrollport so long pages never get clipped.
        */}
        <div className="flex h-dvh max-h-dvh overflow-hidden">
          <Sidebar user={user} balance={balance} />
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
