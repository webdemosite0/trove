import { TrosView } from "./tros-view";
import { TrosDesktopOnly } from "./desktop-only";
import { listAgents } from "@/app/actions/agents";
import { currentUser } from "@/lib/auth";
import { isDesktopShell } from "@/lib/desktop-shell";
import { userHasTrosAccess } from "@/lib/tros-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Tros" };

export default async function TrosPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  // Free (and any non-Pro/Team): open Settings → Tros instead of the product
  if (!userHasTrosAccess(user)) {
    redirect("/dashboard?settings=tros");
  }

  // Desktop app only
  if (!(await isDesktopShell())) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <TrosDesktopOnly />
      </div>
    );
  }

  const agents = await listAgents();
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <TrosView agents={agents} signedIn userName={user.name} />
    </div>
  );
}
