import { SlidesView } from "./slides-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";
import { AllWorkSection } from "@/components/work/all-work-section";

export const metadata = { title: "Decks" };

export default async function SlidesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (c) redirect(`/slides/${encodeURIComponent(c)}`);

  const recents = await listRecents("slides");

  return (
    <div className="h-full overflow-y-auto">
      <SlidesView
        recents={recents}
        recentsLabel={RECENT_LABEL.slides}
        key="new"
      />
      <AllWorkSection limit={18} />
    </div>
  );
}
