import { redirect } from "next/navigation";

const SAFE_VIEWS = new Set(["chat", "files", "code"]);

export default async function LegacyProjectWebsiteSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const requested = view.toLowerCase();

  // Preview is no longer a page. Old preview/terminal/unknown URLs return to
  // the normal builder workspace, where Preview remains an internal pane.
  const safeView = SAFE_VIEWS.has(requested) ? requested : "chat";

  redirect(`/project/${encodeURIComponent(projectId)}/${safeView}`);
}
