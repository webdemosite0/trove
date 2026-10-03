import { notFound } from "next/navigation";
import { loadProject } from "@/lib/projects";
import { WebsitesStudio } from "@/components/studio/websites-studio";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id).catch(() => null);
  return { title: project?.name || "Website" };
}

export default async function WebsiteProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id).catch(() => null);
  if (!project) notFound();

  const file = project.files.find((f) => f.path === "index.html") ?? project.files[0];
  const html = project.previewHtml || file?.content || "";

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <WebsitesStudio
        initialProject={{ id: project.id, name: project.name, prompt: project.prompt, html }}
      />
    </div>
  );
}
