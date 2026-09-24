import { TeamNav } from "@/components/team/team-nav";
import { currentUser } from "@/lib/auth";
import { teamForUser } from "@/lib/team";
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
    <div className="mx-auto w-full max-w-[1080px] px-5 py-7 lg:px-8">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
          Business workspace
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.035em] text-ink">
          Team
        </h1>
        <p className="mt-1.5 max-w-[66ch] text-[13px] leading-relaxed text-ink-3">
          Members, shared projects, invitations, company context, and workspace administration.
        </p>
      </div>
      <TeamNav role={team?.role ?? null} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
