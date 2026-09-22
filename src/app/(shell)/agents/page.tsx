import { AgentsView } from "./agents-view";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const user = await currentUser();
  const agents = await listAgents();
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <AgentsView agents={agents} signedIn={Boolean(user)} />
    </div>
  );
}
