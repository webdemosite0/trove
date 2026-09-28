import { BuilderView, type SiteView } from "../builder-view";

export const metadata = { title: "Websites" };

const ALLOWED: SiteView[] = ["chat", "preview", "files", "code"];

export default async function WebsitesViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view: raw } = await params;
  const view = (ALLOWED.includes(raw as SiteView) ? raw : "chat") as SiteView;
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BuilderView initialView={view} />
    </div>
  );
}
