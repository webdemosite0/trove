import { TrosView } from "./tros-view";
import { TrosDesktopOnly } from "./desktop-only";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";
import { isDesktopShell } from "@/lib/desktop-shell";

export const metadata = { title: "Tros" };

export default async function TrosPage() {
  // Tros is Windows desktop (.exe) only — not browser, not mobile.
  if (!(await isDesktopShell())) {
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
      <TrosView agents={agents} signedIn={Boolean(user)} userName={user?.name ?? null} />
    </div>
  );
}
