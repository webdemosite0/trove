import { currentUser } from "@/lib/auth";
import { teamStateForUser } from "@/lib/team";
import { TeamSectionView } from "@/components/team/team-section-view";

export const metadata = { title: "Team members" };

export default async function TeamMembersPage() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <TeamSectionView
      initial={await teamStateForUser(user)}
      currentUserId={user.id}
      section="members"
    />
  );
}
