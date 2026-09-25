import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";
import { listUserProjects } from "@/lib/projects";
import { TeamChatPanel } from "@/components/team/team-chat-panel";
import { teamChatStateForUser } from "@/lib/team-chat";

export const metadata = { title: "Chat" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c, q } = await searchParams;
  const userPromise = currentUser();
  const teamChatPromise = userPromise.then(async (current) => {
    if (!current) return null;
    try {
      const state = await teamChatStateForUser(current, 80);
      return { ...state, currentUserId: current.id };
    } catch {
      return null;
    }
  });

  const [saved, user, activity, mobile, projects, teamChat] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    userPromise,
    listAllRecents(12),
    isMobile(),
    listUserProjects(40),
    teamChatPromise,
  ]);

  const props = {
    name: user?.name?.split(" ")[0] ?? "there",
    activity,
    restored: saved
      ? { id: saved.id, title: saved.title, messages: saved.messages }
      : null,
    draft: typeof q === "string" ? q.slice(0, 2000) : "",
  };

  const key = saved?.id ?? "new";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {mobile ? (
          <MobileChat key={key} {...props} projects={projects} />
        ) : (
          <HomeChat key={key} {...props} />
        )}
      </div>
      {teamChat ? <TeamChatPanel variant="dock" initialState={teamChat} /> : null}
    </div>
  );
}
