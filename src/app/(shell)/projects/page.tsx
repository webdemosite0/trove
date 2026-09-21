import { redirect } from "next/navigation";

export const metadata = { title: "Projects" };

/** All-work library retired — send users to the home dashboard. */
export default function ProjectsPage() {
  redirect("/dashboard");
}
