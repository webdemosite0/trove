import { listConnections } from "@/lib/connections";
import { currentUser } from "@/lib/auth";
import { SERVICES } from "@/lib/services";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ items: [] }, { status: 401 });
  }

  const connections = await listConnections();
  const byId = new Map(SERVICES.map((s) => [s.id, s]));

  const items = connections.map((c) => {
    const meta = byId.get(c.service);
    return {
      id: c.service,
      name: meta?.name ?? c.service,
      account: c.account || undefined,
      mark: (meta?.name ?? c.service).slice(0, 1).toUpperCase(),
      direct: c.service === "slack" || c.service === "github",
    };
  });

  return Response.json(
    { items: items.sort((a, b) => a.name.localeCompare(b.name)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
