import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";
import { TeamChatPanel } from "@/components/team/team-chat-panel";

export const metadata = { title: "Chat" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string; p?: string }>;
}) {
  const { c, q, p } = await searchParams;
  const userPromise = currentUser();
  const [saved, user, mobile] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    userPromise,
    isMobile(),
  ]);

  const props = {
    name: user?.name?.split(" ")[0] ?? "there",
    activity: [],
    restored: saved
      ? { id: saved.id, title: saved.title, messages: saved.messages }
      : null,
    draft: typeof q === "string" ? q.slice(0, 2000) : "",
    initialProjectId: typeof p === "string" ? p.slice(0, 128) : null,
  };

  const key = saved?.id ?? "new";

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {mobile ? (
          <MobileChat key={key} {...props} projects={[]} />
        ) : (
          <HomeChat key={key} {...props} />
        )}
      </div>
      <TeamChatPanel variant="dock" />
    </div>
  );
}
