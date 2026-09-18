import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { SpreadsheetView } from "../spreadsheet-view";

export const metadata = { title: "Spreadsheet" };

export default async function SpreadsheetWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "sheets") notFound();

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SpreadsheetView
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
