import { DocumentView } from "./document-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";

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
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <DocumentView
        recents={recents}
        recentsLabel={RECENT_LABEL.docs}
        key="new"
      />
    </div>
  );
}
