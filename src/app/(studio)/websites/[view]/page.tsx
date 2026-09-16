import { notFound, redirect } from "next/navigation";
import { BuilderView, type SiteView } from "../builder-view";
import { isMobile } from "@/lib/device";
import { loadConversation } from "@/lib/conversations";
import { loadProject } from "@/lib/projects";

const VIEW_MAP: Record<string, SiteView> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
  terminal: "console",
  console: "console",
};

const VIEW_ROUTE: Record<SiteView, string> = {
  chat: "chat",
  preview: "preview",
  files: "files",
  code: "code",
  console: "terminal",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const label = view === "terminal" ? "Terminal" : view.charAt(0).toUpperCase() + view.slice(1);
  return { title: `${label} · Sites` };
}

export default async function WebsiteSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const [{ view }, { q, c }] = await Promise.all([params, searchParams]);
  const initialView = VIEW_MAP[view.toLowerCase()];
  if (!initialView) notFound();

  const draft = typeof q === "string" ? q.slice(0, 2000) : "";
  const id = typeof c === "string" ? c.trim() : "";
  let restored: { id: string; title: string; idea: string } | null = null;

  if (id) {
    const project = await loadProject(id).catch(() => null);
    if (project) {
      redirect(
        `/websites/project/${encodeURIComponent(project.id)}/${VIEW_ROUTE[initialView]}`,
      );
    }

    const convo = await loadConversation(id).catch(() => null);
    if (convo && convo.kind === "site") {
      const idea = convo.messages.find((message) => message.role === "user")?.text ?? convo.title;
      restored = { id: convo.id, title: convo.title, idea };
    }
  }

  return (
    <BuilderView
      mobile={await isMobile()}
      draft={draft}
      restored={restored}
      initialView={initialView}
    />
  );
}
