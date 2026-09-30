import { TrosView } from "./tros-view";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Tros" };

export default async function TrosPage() {
  const user = await currentUser();
  const agents = await listAgents();
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <TrosView agents={agents} signedIn={Boolean(user)} />
    </div>
  );
}
