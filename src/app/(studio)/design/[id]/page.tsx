import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { parseSavedDesign } from "@/lib/design-saves";
import { DesignView } from "../design-view";

export const metadata = { title: "Design workspace" };

export default async function DesignWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversation = await loadConversation(id).catch(() => null);
  if (!conversation || conversation.kind !== "design") notFound();

  const payload = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "model");
  const design = payload ? parseSavedDesign(payload.text) : null;
  if (!design) notFound();

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DesignView
        restored={{
          id: conversation.id,
          brief: design.brief,
          screens: design.screens,
        }}
      />
    </div>
  );
}
