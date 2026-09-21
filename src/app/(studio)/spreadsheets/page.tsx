import { SpreadsheetView } from "./spreadsheet-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";

export const metadata = { title: "Sheets" };

export default async function SheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (c) redirect(`/spreadsheets/${encodeURIComponent(c)}`);

  const recents = await listRecents("sheets");

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <SpreadsheetView
        recents={recents}
        recentsLabel={RECENT_LABEL.sheets}
        key="new"
      />
    </div>
  );
}
