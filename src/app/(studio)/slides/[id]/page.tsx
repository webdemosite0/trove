import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { SlidesView } from "../slides-view";

export const metadata = { title: "Deck" };

export default async function SlidesWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "slides") notFound();

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SlidesView
        restored={{
          id: saved.id,
          title: saved.messages.find((m) => m.role === "user")?.text ?? saved.title,
          messages: saved.messages,
        }}
        key={saved.id}
      />
    </div>
  );
}
