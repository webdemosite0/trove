import { DesignView } from "./design-view";
import { listRecents } from "@/lib/recents";
import { redirect } from "next/navigation";

export const metadata = { title: "Design" };

/**
 * Design is a brief + screen set, not a prose tool.
 */
export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (c) redirect(`/design/${encodeURIComponent(c)}`);

  const recents = await listRecents("design");
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DesignView recents={recents} />
    </div>
  );
}
