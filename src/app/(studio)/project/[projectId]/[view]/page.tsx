import { notFound, redirect } from "next/navigation";
import { BuilderView, type SiteView } from "../../../websites/builder-view";
import { isMobile } from "@/lib/device";
import { loadProject } from "@/lib/projects";

/** User-facing panes only — terminal/console is not a SiteView. */
const VIEW_MAP: Record<string, SiteView> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const project = await loadProject(projectId).catch(() => null);
  const requested = view.toLowerCase();
  const initialView = VIEW_MAP[requested];
  const label = initialView
    ? initialView.charAt(0).toUpperCase() + initialView.slice(1)
    : requested === "terminal" || requested === "console"
      ? "Preview"
      : "Project";
  return {
    title: project ? `${project.name} · ${label} · Trove` : `${label} · Trove`,
  };
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>;
}) {
  const { projectId, view } = await params;
  const requested = view.toLowerCase();

  // Terminal is intentionally backend-only. Old terminal URLs land on Preview.
  if (requested === "terminal" || requested === "console") {
    redirect(`/project/${encodeURIComponent(projectId)}/preview`);
  }

  const initialView = VIEW_MAP[requested];
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
