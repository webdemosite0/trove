import { BuilderView } from "./builder-view";
import { isMobile } from "@/lib/device";
import { loadConversation } from "@/lib/conversations";
import { listRecents } from "@/lib/recents";

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
    const convo = await loadConversation(id);
    if (convo && convo.kind === "site") {
      const idea =
        convo.messages.find((m) => m.role === "user")?.text ?? convo.title;
      restored = { id: convo.id, title: convo.title, idea };
    }
  }

  const recentSites = await listRecents("site", 24);

  return (
    <BuilderView
      mobile={await isMobile()}
      draft={draft}
      restored={restored}
      recentSites={recentSites.map((r) => ({
        id: r.conversationId ?? r.id,
        title: r.title,
        href:
          r.href ||
          `/websites?c=${encodeURIComponent(r.conversationId ?? r.id)}`,
      }))}
    />
  );
}
