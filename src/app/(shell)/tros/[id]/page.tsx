import { notFound } from "next/navigation";
import { AgentChat } from "./agent-chat";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { listAgents, type AgentRow } from "@/app/actions/agents";
import { isMobile } from "@/lib/device";
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
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const [{ id }, { c, q }] = await Promise.all([params, searchParams]);

  if (await isMobile()) return <TrosDesktopOnly />;

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
    species: row.species == null ? null : str(row.species),
    mode: row.mode == null ? null : str(row.mode),
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
      // ?q= (from the Tros home composer) auto-sends as the first turn of a
      // fresh thread. Ignored when restoring an existing conversation (?c=).
      firstMessage={!saved && q ? q : undefined}
      key={saved?.id ?? "new"}
    />
  );
}
