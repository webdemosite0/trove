import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { composioConfigured, COMPOSIO_MAP } from "@/lib/composio";
import { connectableProviders } from "@/lib/providers";
import { serviceById } from "@/lib/services";
import { PluginDetailView } from "@/components/integrations/plugin-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = serviceById(id);
  return {
    title: service ? `${service.name} · Plugins` : "Plugin",
  };
}

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = serviceById(id);
  if (!service) notFound();

  const user = await currentUser();
  const connections = user ? await listConnections() : [];
  const connected = connections.some((c) => c.service === id);
  const connectable = connectableProviders()[id];
  const composioOn = composioConfigured();

  return (
    <PluginDetailView
      service={service}
      connected={connected}
      connectable={connectable}
      signedIn={Boolean(user)}
      composioOn={composioOn}
      composioService={composioOn && Boolean(COMPOSIO_MAP[id])}
    />
  );
}
