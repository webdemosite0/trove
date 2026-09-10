import { Suspense } from "react";
import { Backdrop } from "@/components/shell/backdrop";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import type { Recent } from "@/lib/recents";
import { isMobile } from "@/lib/device";
import { MobileShell } from "@/components/mobile/shell";
import { YourWork } from "@/components/shell/your-work";

function YourWorkSlot({ items, className }: { items: Recent[]; className?: string }) {
  return (
    <Suspense fallback={null}>
      <YourWork items={items} className={className} />
    </Suspense>
  );
}

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  if (await isMobile()) {
    const recents = await listAllRecents(8);
    return (
      <ToastProvider>
        <Backdrop />
        <MobileShell
          user={{ name: user.name, email: user.email }}
          balance={balance}
        >
          {children}
          <YourWorkSlot items={recents} className="px-3 pb-24" />
        </MobileShell>
      </ToastProvider>
    );
  }

  const [due, recents] = await Promise.all([
    countDueReminders(),
    listAllRecents(8),
  ]);

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette recents={recents} />
        <div className="flex min-h-screen">
          <Sidebar user={user} balance={balance} />
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <YourWorkSlot items={recents} />
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
