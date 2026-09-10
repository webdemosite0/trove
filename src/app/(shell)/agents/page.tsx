import { AgentsView } from "./agents-view";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const user = await currentUser();
  const agents = await listAgents();
  return <AgentsView agents={agents} signedIn={Boolean(user)} />;
}
