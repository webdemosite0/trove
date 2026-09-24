import { ProjectsView } from "./projects-view";
import { listUserProjects } from "@/lib/projects";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await currentUser();
  const projects = user ? await listUserProjects(40) : [];
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <ProjectsView projects={projects} signedIn={Boolean(user)} />
    </div>
  );
}
