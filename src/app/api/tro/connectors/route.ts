import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { SERVICES } from "@/lib/services";

export const runtime = "nodejs";

/** Connected integrations for the Tro workspace's Connectors panel section. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let connections: { service: string; account?: string | null }[] = [];
  try {
    connections = await listConnections();
  } catch {
    connections = [];
  }

  return Response.json({
    connectors: connections.map((c) => {
      const meta = SERVICES.find((s) => s.id === c.service);
      return {
        service: c.service,
        label: meta?.name ?? c.service,
        account: c.account ?? null,
      };
    }),
  });
}
