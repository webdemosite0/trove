import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { ToolPage } from "@/components/tools/tool-page";

export const metadata = { title: "Research workspace" };

export default async function ResearchWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "research") notFound();

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <ToolPage
        tool="research"
        title="Research"
        tagline="Structured analysis that separates what is known from what is not."
        placeholder="Ask a follow-up…"
        accent="#22d3ee"
        examples={[]}
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
