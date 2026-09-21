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
 * Studio layout (websites, documents, spreadsheets, slides, design).
 * Auth via resolveShell. Credits are loaded in StudioChrome (/api/shell-meta).
 * Do not read balance from the shell gate here.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await resolveShell();
  if (!result.ok) {
    return result.screen;
  }

  const { user } = result;

  if (await isMobile()) {
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
