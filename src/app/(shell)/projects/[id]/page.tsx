import { notFound } from "next/navigation";
import { loadProject } from "@/lib/projects";
import { currentUser } from "@/lib/auth";
import { ProjectDetail } from "./project-detail";

export const metadata = { title: "Project" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) notFound();

  const project = await loadProject(id);
  if (!project) notFound();

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <ProjectDetail
        project={{
          id: project.id,
          name: project.name,
          prompt: project.prompt,
          status: project.status,
          updatedAt: project.updatedAt,
        }}
      />
    </div>
  );
}
