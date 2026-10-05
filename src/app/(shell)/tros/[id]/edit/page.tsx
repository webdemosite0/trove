import { notFound } from "next/navigation";
import { TroEdit } from "@/components/tros/tro-edit";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { isMobile } from "@/lib/device";
import { TrosDesktopOnly } from "../../desktop-only";
import type { AgentRow } from "@/app/actions/agents";

export const metadata = { title: "Edit Tro" };
export const dynamic = "force-dynamic";

export default async function EditTroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (await isMobile()) return <TrosDesktopOnly />;

  const user = await currentUser();
  if (!user) notFound();

  const row = await one(`SELECT * FROM agents WHERE id = ? AND user_id = ?`, [id, user.id]);
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

  return (
    <div className="h-full min-h-0 overflow-hidden bg-canvas">
      <TroEdit agent={agent} />
    </div>
  );
}
