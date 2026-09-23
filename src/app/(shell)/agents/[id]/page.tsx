import { notFound } from "next/navigation";
import { AgentChat } from "./agent-chat";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import type { AgentRow } from "@/app/actions/agents";

export const metadata = { title: "Agent" };

function convoIdFromHref(href: string): string | null {
  try {
    const u = new URL(href, "https://trove.local");
    const c = u.searchParams.get("c");
    return c?.trim() || null;
  } catch {
    return null;
  }
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ id }, { c }] = await Promise.all([params, searchParams]);

  const user = await currentUser();
  if (!user) notFound();

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
    created_at: num(row.created_at),
  };

  const recents = await listRecents("agent", 40);
  const forAgent = recents.filter(
    (r) =>
      r.href.includes(`/agents/${id}`) ||
      r.title.startsWith(`${agent.name}:`),
  );

  let saved = c ? await loadConversation(c) : null;
  if (!saved && forAgent[0]) {
    const cid = convoIdFromHref(forAgent[0].href);
    if (cid) saved = await loadConversation(cid);
  }

  return (
    <AgentChat
      agent={agent}
      recents={forAgent}
      restored={saved ? { id: saved.id, messages: saved.messages } : null}
      key={saved?.id ?? "new"}
    />
  );
}
