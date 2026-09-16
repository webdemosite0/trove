import { notFound } from "next/navigation";
import { BuilderView, type SiteView } from "../../../builder-view";
import { isMobile } from "@/lib/device";
import { loadProject } from "@/lib/projects";

const VIEW_MAP: Record<string, SiteView> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
  terminal: "console",
  console: "console",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const project = await loadProject(projectId).catch(() => null);
  const label = view === "terminal" ? "Terminal" : view.charAt(0).toUpperCase() + view.slice(1);
  return {
    title: project ? `${project.name} · ${label} · Sites` : `${label} · Sites`,
  };
}

export default async function ProjectWebsiteSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const initialView = VIEW_MAP[view.toLowerCase()];
  if (!initialView) notFound();

  const project = await loadProject(projectId).catch(() => null);
  if (!project) notFound();

  return (
    <BuilderView
      mobile={await isMobile()}
      restored={{
        id: project.id,
        title: project.name,
        idea: project.prompt,
      }}
      initialView={initialView}
    />
  );
}
