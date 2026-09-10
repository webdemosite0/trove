import { listConnections } from "@/lib/connections";
import { SERVICES } from "@/lib/services";

export const runtime = "nodejs";

export async function GET() {
  const connections = await listConnections();
  const byId = new Map(SERVICES.map((s) => [s.id, s]));

  const items = connections.map((c) => {
    const meta = byId.get(c.service);
    return {
      id: c.service,
      name: meta?.name ?? c.service,
      account: c.account || undefined,
      mark: (meta?.name ?? c.service).slice(0, 1).toUpperCase(),
    };
  });

  return Response.json({ items });
}
