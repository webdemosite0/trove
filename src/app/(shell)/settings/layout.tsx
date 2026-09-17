import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(84,116,255,.06),transparent_30%),linear-gradient(to_bottom,#fbfbfc,#f7f8fa)]">
      <div className="nx-in mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="rounded-[26px] border border-black/[0.05] bg-white/70 p-5 shadow-[0_24px_70px_rgba(15,23,42,.05)] backdrop-blur-xl sm:p-6">
          <PageHeader
            title="Settings"
            subtitle="Manage your account, billing, workspace and preferences."
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
          <aside className="rounded-[22px] border border-black/[0.05] bg-white/55 p-2.5 backdrop-blur-xl lg:self-start lg:sticky lg:top-5">
            <SettingsNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
