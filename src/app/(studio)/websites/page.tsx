import { BuilderView } from "./builder-view";
import { isMobile } from "@/lib/device";

export const metadata = { title: "Sites" };

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const draft = typeof q === "string" ? q.slice(0, 2000) : "";
  return <BuilderView mobile={await isMobile()} draft={draft} />;
}
