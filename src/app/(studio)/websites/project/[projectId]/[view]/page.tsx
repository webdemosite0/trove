import { redirect } from "next/navigation";

const SAFE_VIEWS = new Set(["chat", "preview", "files", "code"]);

export default async function LegacyProjectWebsiteSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const requested = view.toLowerCase();

  // terminal/console and any unknown segment → preview
  const safeView = SAFE_VIEWS.has(requested) ? requested : "preview";

  redirect(`/project/${encodeURIComponent(projectId)}/${safeView}`);
}
