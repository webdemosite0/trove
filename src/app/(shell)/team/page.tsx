import { currentUser } from "@/lib/auth";
import { teamStateForUser } from "@/lib/team";
import { TeamWorkspaceView } from "@/components/team/team-workspace-view";

export const metadata = { title: "Team workspace" };

export default async function TeamPage() {
  const user = await currentUser();
  if (!user) return null;

  const state = await teamStateForUser(user);

  return (
    <TeamWorkspaceView
      initial={state}
      currentUserId={user.id}
      currentPlan={user.plan}
    />
  );
}
