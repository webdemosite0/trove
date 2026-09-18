import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { DocumentView } from "../document-view";

export const metadata = { title: "Document" };

export default async function DocumentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "docs") notFound();

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <DocumentView
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
