import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { decodeSheet } from "@/lib/sheet-format";
import { SheetEditor } from "../sheet-editor";

export const metadata = { title: "Spreadsheet" };

export default async function SpreadsheetWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "sheets") notFound();

  const latest = [...saved.messages]
    .reverse()
    .find((m) => m.role === "model")?.text;
  const doc = latest ? decodeSheet(latest) : null;

  if (!doc) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-critical/10 text-critical">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </span>
          <p className="max-w-[320px] text-[14px] font-medium text-ink">
            Couldn't read this spreadsheet
          </p>
          <p className="max-w-[320px] text-[13px] text-ink-3">
            This spreadsheet couldn't be read. It may have been saved by an
            older version.
          </p>
        </div>
      </div>
    );
  }

  const userPrompt =
    saved.messages.find((m) => m.role === "user")?.text ?? doc.title;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SheetEditor
        sheetId={saved.id}
        initial={{ title: doc.title || saved.title, grid: doc.grid, prompt: userPrompt }}
        key={saved.id}
      />
    </div>
  );
}
