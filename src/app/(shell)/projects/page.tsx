import { redirect } from "next/navigation";
import { isMobile } from "@/lib/device";
import { currentUser } from "@/lib/auth";
import { all, str, num } from "@/lib/db";
import { ProjectsView, type ProjectRow } from "./projects-view";

export const metadata = {
  title: "Projects",
  description: "Cloud and local project workspaces",
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  // Mobile product surface does not include the project system
  if (await isMobile()) redirect("/chat");

  const user = await currentUser();
  let projects: ProjectRow[] = [];
  if (user) {
    try {
      const rows = await all(
        `SELECT id, name, prompt, status, updated_at
         FROM projects WHERE user_id = ?
         ORDER BY updated_at DESC LIMIT 100`,
        [user.id],
      );
      projects = rows.map((r) => ({
        id: str(r.id),
        name: str(r.name),
        prompt: str(r.prompt),
        status: str(r.status) || "draft",
        updatedAt: num(r.updated_at),
      }));
    } catch {
      projects = [];
    }
  }

  return <ProjectsView projects={projects} signedIn={Boolean(user)} />;
}
