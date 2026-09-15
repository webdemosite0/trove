import { BuilderView } from "./builder-view";
import { isMobile } from "@/lib/device";
import { loadConversation } from "@/lib/conversations";
import { listRecents } from "@/lib/recents";
import { loadProject, listUserProjects } from "@/lib/projects";

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
    // Prefer builder project snapshot (has files)
    const project = await loadProject(id).catch(() => null);
    if (project) {
      restored = {
        id: project.id,
        title: project.name,
        idea: project.prompt,
      };
    } else {
      const convo = await loadConversation(id).catch(() => null);
      if (convo && convo.kind === "site") {
        const idea =
          convo.messages.find((m) => m.role === "user")?.text ?? convo.title;
        restored = { id: convo.id, title: convo.title, idea };
      } else if (id) {
        restored = { id, title: "Restored site", idea: "" };
      }
    }
  }

  const [recentSites, projects] = await Promise.all([
    listRecents("site", 24).catch(() => []),
    listUserProjects(24).catch(() => []),
  ]);

  const seen = new Set<string>();
  const merged: { id: string; title: string; href: string; createdAt: number }[] = [];

  for (const p of projects) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push({
      id: p.id,
      title: p.name,
      href: `/websites?c=${encodeURIComponent(p.id)}`,
      createdAt: p.updatedAt,
    });
  }
  for (const r of recentSites) {
    const rid = r.conversationId ?? r.id;
    if (seen.has(rid)) continue;
    seen.add(rid);
    merged.push({
      id: rid,
      title: r.title,
      href: r.href || `/websites?c=${encodeURIComponent(rid)}`,
      createdAt: r.createdAt,
    });
  }

  return (
    <BuilderView
      mobile={await isMobile()}
      draft={draft}
      restored={restored}
      recentSites={merged.slice(0, 24)}
    />
  );
}
