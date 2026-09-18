import { DocumentView } from "./document-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";
import { AllWorkSection } from "@/components/work/all-work-section";

export const metadata = { title: "Docs" };

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (c) redirect(`/documents/${encodeURIComponent(c)}`);

  const recents = await listRecents("docs");

  return (
    <div className="h-full overflow-y-auto">
      <DocumentView
        recents={recents}
        recentsLabel={RECENT_LABEL.docs}
        key="new"
      />
      <AllWorkSection limit={18} />
    </div>
  );
}
