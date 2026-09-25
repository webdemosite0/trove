import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";
import { listUserProjects } from "@/lib/projects";

export const metadata = { title: "Chat" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c, q } = await searchParams;
  const [saved, user, activity, mobile, projects] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    currentUser(),
    listAllRecents(12),
    isMobile(),
    listUserProjects(40),
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

  return mobile ? (
    <MobileChat key={key} {...props} projects={projects} />
  ) : (
    <HomeChat key={key} {...props} />
  );
}
