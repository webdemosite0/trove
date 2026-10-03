import { notFound, redirect } from "next/navigation";
import { AgentChat } from "./agent-chat";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { listAgents, type AgentRow } from "@/app/actions/agents";
import { isDesktopShell } from "@/lib/desktop-shell";
import { userHasTrosAccess } from "@/lib/tros-access";
import { TrosDesktopOnly } from "../desktop-only";

export const metadata = { title: "Tro" };

function convoIdFromHref(href: string): string | null {
  try {
    const u = new URL(href, "https://trove.local");
    const c = u.searchParams.get("c");
    return c?.trim() || null;
  } catch {
    return null;
  }
}

export default async function TroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!userHasTrosAccess(user)) {
    redirect("/dashboard?settings=tros");
  }

  if (!(await isDesktopShell())) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <TrosDesktopOnly />
      </div>
    );
  }

  const [{ id }, { c }] = await Promise.all([params, searchParams]);

  const row = await one(
    `SELECT * FROM agents WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );
  if (!row) notFound();

  const agent: AgentRow = {
    id: str(row.id),
    name: str(row.name),
    role: str(row.role),
    instructions: str(row.instructions),
    tools: str(row.tools),
    accent: str(row.accent),
    parent_id: row.parent_id == null ? null : str(row.parent_id),
    created_at: num(row.created_at),
  };

  const recents = await listRecents("agent", 40);
  const forAgent = recents.filter(
    (r) =>
      r.href.includes(`/tros/${id}`) ||
      r.href.includes(`/agents/${id}`) ||
      r.title.startsWith(`${agent.name}:`),
  );

  let saved = c ? await loadConversation(c) : null;
  if (!saved && forAgent[0]) {
    const cid = convoIdFromHref(forAgent[0].href);
    if (cid) saved = await loadConversation(cid);
  }

  const agents = await listAgents();

  return (
    <AgentChat
      agent={agent}
      agents={agents}
      recents={forAgent}
      restored={saved ? { id: saved.id, messages: saved.messages } : null}
      key={saved?.id ?? "new"}
    />
  );
}
