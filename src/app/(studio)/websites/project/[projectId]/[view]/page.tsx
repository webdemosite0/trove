import { redirect } from "next/navigation";

export default async function LegacyProjectWebsiteSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const requested = view.toLowerCase();
  const safeView = ["chat", "preview", "files", "code"].includes(requested)
    ? requested
    : "preview";

  redirect(`/project/${encodeURIComponent(projectId)}/${safeView}`);
}
