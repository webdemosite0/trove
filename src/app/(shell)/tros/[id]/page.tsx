import { notFound } from "next/navigation";
import { AgentChat } from "./agent-chat";
import { TrosDesktopOnly } from "../desktop-only";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { listRecents } from "@/lib/recents";
import { isDesktopShell } from "@/lib/desktop-shell";

export const metadata = { title: "Tro" };

export default async function TroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isDesktopShell())) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <TrosDesktopOnly />
      </div>
    );
  }

  const { id } = await params;
  const user = await currentUser();
  if (!user) notFound();

  const agent = await one<{ id: string; name: string; role: string }>(
    `SELECT id, name, role FROM agents WHERE id = $1 AND user_id = $2`,
    [id, user.id],
    (r) => ({ id: str(r.id), name: str(r.name), role: str(r.role) }),
  );
  if (!agent) notFound();

  const recents = await listRecents("agent", 12).catch(() => []);

  return (
    <AgentChat
      agentId={agent.id}
      agentName={agent.name}
      agentRole={agent.role}
      recents={recents}
    />
  );
}
