import { SheetsStudio } from "@/components/studio/sheets-studio";

export const metadata = { title: "New spreadsheet" };

export default async function NewSpreadsheetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SheetsStudio
        sheetId={null}
        initial={q ? { title: "Untitled sheet", grid: [], prompt: q } : null}
        key={q ?? "blank"}
      />
    </div>
  );
}
