import { TrosView } from "./tros-view";
import { MobileTrosHome } from "@/components/mobile/tros-home";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";

export const metadata = { title: "Tros" };

export default async function TrosPage() {
  const user = await currentUser();
  const agents = await listAgents();
  if (await isMobile()) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <MobileTrosHome agents={agents} />
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <TrosView agents={agents} signedIn={Boolean(user)} userName={user?.name ?? null} />
    </div>
  );
}
