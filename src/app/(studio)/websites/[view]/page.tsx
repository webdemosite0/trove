import { notFound, redirect } from "next/navigation";
import { BuilderView, type SiteView } from "../builder-view";
import { isMobile } from "@/lib/device";
import { loadConversation } from "@/lib/conversations";
import { loadProject } from "@/lib/projects";

/** Preview is an internal builder pane, not a standalone page. */
const VIEW_MAP: Record<string, SiteView> = {
  chat: "chat",
  files: "files",
  code: "code",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const requested = view.toLowerCase();
  const label =
    requested === "preview" || requested === "terminal" || requested === "console"
      ? "Chat"
      : view.charAt(0).toUpperCase() + view.slice(1);
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
  const requested = view.toLowerCase();

  // The old full-page Preview and terminal destinations no longer exist.
  if (requested === "preview" || requested === "terminal" || requested === "console") {
    if (typeof c === "string" && c.trim()) {
      redirect(`/project/${encodeURIComponent(c.trim())}/chat`);
    }
    redirect("/websites/chat");
  }

  const initialView = VIEW_MAP[requested];
  if (!initialView) notFound();

  const draft = typeof q === "string" ? q.slice(0, 2000) : "";
  const id = typeof c === "string" ? c.trim() : "";
  let restored: { id: string; title: string; idea: string } | null = null;

  if (id) {
    const project = await loadProject(id).catch(() => null);
    if (project) {
      redirect(`/project/${encodeURIComponent(project.id)}/${initialView}`);
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
