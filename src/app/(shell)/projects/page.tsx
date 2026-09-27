import { redirect } from "next/navigation";
import { isMobile } from "@/lib/device";
import { currentUser } from "@/lib/auth";
import { ProjectsView } from "./projects-view";

export const metadata = {
  title: "Projects",
  description: "Cloud and local project workspaces",
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  // Mobile product surface does not include the project system
  if (await isMobile()) redirect("/chat");

  const user = await currentUser();
  return <ProjectsView signedIn={Boolean(user)} />;
}
