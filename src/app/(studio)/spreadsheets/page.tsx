import { SpreadsheetView } from "./spreadsheet-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";
import { AllWorkSection } from "@/components/work/all-work-section";

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
    <div className="h-full overflow-y-auto">
      <SpreadsheetView
        recents={recents}
        recentsLabel={RECENT_LABEL.sheets}
        key="new"
      />
      <AllWorkSection limit={18} />
    </div>
  );
}
