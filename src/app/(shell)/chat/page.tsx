import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";
import { listChatProjects } from "@/lib/chat-projects";

export const metadata = { title: "Chat" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string; p?: string }>;
}) {
  const { c, q, p } = await searchParams;
  const [saved, user, activity, mobile, projects] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    currentUser(),
    listAllRecents(12),
    isMobile(),
    listChatProjects(40),
  ]);

  const props = {
    name: user?.name?.split(" ")[0] ?? "there",
    activity,
    projects,
    initialProjectId: typeof p === "string" ? p.slice(0, 128) : null,
    restored: saved
      ? { id: saved.id, title: saved.title, messages: saved.messages }
      : null,
    draft: typeof q === "string" ? q.slice(0, 2000) : "",
  };

  const key = saved?.id ?? (typeof p === "string" ? `p-${p}` : "new");

  return mobile ? (
    <MobileChat key={key} {...props} />
  ) : (
    <HomeChat key={key} {...props} />
  );
}
