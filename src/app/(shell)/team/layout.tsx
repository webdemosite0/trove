import { Suspense } from "react";
import { TeamShell } from "@/components/team/team-shell";
import { TeamInviteAccept } from "@/components/team/team-invite-accept";
import { currentUser } from "@/lib/auth";
import { teamForUser } from "@/lib/team";

export default async function TeamAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const team = user ? await teamForUser(user.id) : null;

  return (
    <TeamShell
      teamName={team?.name ?? "Team workspace"}
      role={team?.role ?? null}
    >
      <Suspense fallback={null}>
        <TeamInviteAccept />
      </Suspense>
      {children}
    </TeamShell>
  );
}
