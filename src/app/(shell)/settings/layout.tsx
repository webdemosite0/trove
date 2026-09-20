import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-canvas">
      <div className="nx-in mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-line p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.28), transparent 50%), radial-gradient(ellipse at 100% 0%, rgba(56,189,248,0.22), transparent 45%), radial-gradient(ellipse at 50% 120%, rgba(244,114,182,0.18), transparent 50%)",
            }}
          />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-violet-500">
              Account
            </p>
            <h1 className="mt-1.5 text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold tracking-[-0.03em] text-ink">
              Settings
            </h1>
            <p className="mt-1.5 max-w-[48ch] text-[14px] text-ink-3">
              Manage your profile, billing, appearance, and affiliate rewards.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <aside className="rounded-[22px] border border-line bg-rail/70 p-2.5 backdrop-blur-xl lg:sticky lg:top-20 lg:self-start">
            <SettingsNav />
          </aside>
          <div className="min-w-0 space-y-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
