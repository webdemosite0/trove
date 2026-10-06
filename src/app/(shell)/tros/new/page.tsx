import { NewTroWizard } from "./wizard";
import { TrosDesktopOnly } from "../desktop-only";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";
import { listConnections } from "@/lib/connections";
import { serviceById } from "@/lib/services";

export const metadata = { title: "Create Tro" };

type Params = Record<string, string | string[] | undefined>;

function pick(params: Params, key: string): string {
  const v = params[key];
  return typeof v === "string" ? v : "";
}

export default async function NewTroPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  if (await isMobile()) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <TrosDesktopOnly />
      </div>
    );
  }

  const params = await searchParams;
  const user = await currentUser();
  const agents = user ? await listAgents().catch(() => []) : [];

  let connectors: { service: string; label: string; account: string | null }[] = [];
  if (user) {
    try {
      const conns = await listConnections();
      connectors = conns.map((c) => ({
        service: c.service,
        label: serviceById(c.service)?.name ?? c.service,
        account: c.account ?? null,
      }));
    } catch {
      connectors = [];
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-canvas">
      <NewTroWizard
        initial={{
          name: pick(params, "name"),
          role: pick(params, "role"),
          instructions: pick(params, "instructions"),
          describe: pick(params, "describe"),
        }}
        initialSpecies={pick(params, "species")}
        team={agents.map((a) => ({ id: a.id, name: a.name }))}
        connectors={connectors}
        defaultTroId={agents[0]?.id ?? null}
        anonymous={!user}
      />
    </div>
  );
}
