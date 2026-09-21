import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { redirect } from "next/navigation";
import { SlidesView } from "./slides-view";

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
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <SlidesView
        recents={recents}
        recentsLabel={RECENT_LABEL.slides}
        key="new"
      />
    </div>
  );
}
