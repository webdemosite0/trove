import { IntegrationsView } from "./integrations-view";
import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { PROVIDERS } from "@/lib/providers";
import { nangoEnabled, NANGO_MAP } from "@/lib/nango";

export const metadata = { title: "Apps" };
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
  );
}
