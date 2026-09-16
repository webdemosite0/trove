import { redirect } from "next/navigation";
import { BuilderView } from "./builder-view";
import { isMobile } from "@/lib/device";
import { loadConversation } from "@/lib/conversations";
import { loadProject } from "@/lib/projects";

export const metadata = { title: "Sites" };

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const { q, c } = await searchParams;
  const draft = typeof q === "string" ? q.slice(0, 2000) : "";
  const id = typeof c === "string" ? c.trim() : "";

  let restored: { id: string; title: string; idea: string } | null = null;

  if (id) {
    const project = await loadProject(id).catch(() => null);
    if (project) {
      redirect(`/project/${encodeURIComponent(project.id)}/preview`);
    }

    const convo = await loadConversation(id).catch(() => null);
    if (convo && convo.kind === "site") {
      const idea = convo.messages.find((m) => m.role === "user")?.text ?? convo.title;
      restored = { id: convo.id, title: convo.title, idea };
    }
  }

  return (
    <BuilderView
      mobile={await isMobile()}
      draft={draft}
      restored={restored}
    />
  );
}
