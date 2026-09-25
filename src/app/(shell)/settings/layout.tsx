import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <SettingsSidebar />

      <main className="min-w-0 flex-1">
        <div className="nx-in mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="relative mb-7 overflow-hidden rounded-[26px] border border-line-strong bg-raised/82 px-5 py-5 shadow-[var(--sh-1)] sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 0% 0%, rgba(168,85,247,0.18), transparent 48%), radial-gradient(ellipse at 100% 0%, rgba(59,130,246,0.16), transparent 44%), radial-gradient(ellipse at 70% 120%, rgba(236,72,153,0.10), transparent 48%)",
              }}
            />
            <div className="relative">
              <h1 className="text-[clamp(1.55rem,1.2rem+1vw,2rem)] font-semibold tracking-[-0.03em] text-ink">
                Settings
              </h1>
              <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-3">
                Manage your account, business context, AI behavior, billing, appearance,
                downloads, and connected workspace.
              </p>
            </div>
          </div>

          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
