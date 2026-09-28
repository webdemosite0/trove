import { BuilderView, type SiteView } from "../../../builder-view";

export const metadata = { title: "Websites" };

const ALLOWED: SiteView[] = ["chat", "preview", "files", "code"];

export default async function WebsiteProjectViewPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view: raw } = await params;
  const view = (ALLOWED.includes(raw as SiteView) ? raw : "chat") as SiteView;
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BuilderView
        initialView={view}
        restored={{ id: projectId, title: "Site", idea: "" }}
      />
    </div>
  );
}
