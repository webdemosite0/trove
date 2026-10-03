import { listConnections } from "@/lib/connections";
import { currentUser } from "@/lib/auth";
import { SERVICES } from "@/lib/services";
import {
  GOOGLE_UMBRELLA_ID,
  GOOGLE_UMBRELLA_SERVICES,
} from "@/lib/composio-map";

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

  // Google umbrella: offer @google when all bundled services are connected.
  const connectedIds = new Set(connections.map((c) => c.service));
  if (GOOGLE_UMBRELLA_SERVICES.every((id) => connectedIds.has(id))) {
    const gmailConn = connections.find((c) => c.service === "gmail");
    items.push({
      id: GOOGLE_UMBRELLA_ID,
      name: "Google",
      account: gmailConn?.account || undefined,
      mark: "G",
      direct: false,
    });
  }

  return Response.json(
    { items: items.sort((a, b) => a.name.localeCompare(b.name)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
