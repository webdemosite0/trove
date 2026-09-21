import { ToolPage } from "@/components/tools/tool-page";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";

export const metadata = { title: "Research" };

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (c) redirect(`/research/${encodeURIComponent(c)}`);

  const recents = await listRecents("research");

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <ToolPage
        tool="research"
        title="Research"
        tagline="Structured analysis that separates what is known from what is not."
        placeholder="Research…"
        accent="#22d3ee"
        examples={[
          "Trade-offs between event sourcing and CRUD",
          "How rate limiting strategies compare at scale",
          "When to choose Postgres over a document store",
        ]}
        recents={recents}
        recentsLabel={RECENT_LABEL.research}
        key="new"
      />
    </div>
  );
}
