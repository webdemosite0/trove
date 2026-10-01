import { TrosView } from "./tros-view";
import { TrosDesktopOnly } from "./desktop-only";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";

export const metadata = { title: "Tros" };

export default async function TrosPage() {
  if (await isMobile()) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <TrosDesktopOnly />
      </div>
    );
  }
  const user = await currentUser();
  const agents = await listAgents();
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <TrosView agents={agents} signedIn={Boolean(user)} />
    </div>
  );
}
