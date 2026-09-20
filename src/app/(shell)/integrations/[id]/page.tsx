import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { PROVIDERS } from "@/lib/providers";
import { nangoEnabled, NANGO_MAP } from "@/lib/nango";
import { SERVICES } from "@/lib/services";
import { PluginDetailView } from "@/components/integrations/plugin-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = SERVICES.find((x) => x.id === id);
  return { title: s ? s.name : "Plugin" };
}

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = SERVICES.find((s) => s.id === id);
  if (!service) notFound();

  const user = await currentUser();
  const connections = await listConnections();
  const connected = connections.some((c) => c.service === id);
  const provider = PROVIDERS[id as keyof typeof PROVIDERS];

  return (
    <PluginDetailView
      service={service}
      connected={connected}
      connectable={
        provider
          ? { label: provider.label, help: provider.help, docs: provider.docs }
          : undefined
      }
      signedIn={Boolean(user)}
      nangoOn={nangoEnabled()}
      nangoService={id in NANGO_MAP}
    />
  );
}
