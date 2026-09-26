import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { composioConfigured, COMPOSIO_MAP } from "@/lib/composio";
import { connectableProviders } from "@/lib/providers";
import { IntegrationsView } from "./integrations-view";

export const metadata = {
  title: "Plugins & Integrations",
  description: "Connect Gmail, Slack, GitHub, Notion and more to use them in Trove chat.",
};

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await currentUser();
  const connections = user ? await listConnections() : [];
  const connectable = connectableProviders();
  const composioOn = composioConfigured();

  return (
    <IntegrationsView
      signedIn={Boolean(user)}
      connected={connections.map((c) => ({
        service: c.service,
        account: c.account,
        hint: c.hint,
      }))}
      connectable={connectable}
      composioOn={composioOn}
      composioServices={composioOn ? Object.keys(COMPOSIO_MAP) : []}
    />
  );
}
