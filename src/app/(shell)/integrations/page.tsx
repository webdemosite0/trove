import { IntegrationsView } from "./integrations-view";
import { IntegrationsHero } from "@/components/integrations/hero";
import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { PROVIDERS } from "@/lib/providers";
import { SERVICES } from "@/lib/services";
import { nangoEnabled, NANGO_MAP } from "@/lib/nango";

export const metadata = {
  title: "Plugins & Integrations",
  description:
    "Connect the tools your business already uses so Trove can bring context and supported actions into one AI workspace.",
};
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await currentUser();
  const connections = await listConnections();

  const connectable = Object.fromEntries(
    Object.entries(PROVIDERS).map(([id, p]) => [
      id,
      { label: p.label, help: p.help, docs: p.docs },
    ]),
  );

  return (
    <div className="mx-auto w-full max-w-[1020px] px-4 py-8 sm:px-6">
      <IntegrationsHero total={SERVICES.length} connected={connections.length} />
      <div className="mt-5">
        <IntegrationsView
          connected={connections.map((c) => ({
            service: c.service,
            account: c.account,
            hint: c.hint,
          }))}
          connectable={connectable}
          signedIn={Boolean(user)}
          nangoOn={nangoEnabled()}
          nangoServices={Object.keys(NANGO_MAP)}
        />
      </div>
    </div>
  );
}
