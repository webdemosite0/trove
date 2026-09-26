import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  acceptTeamInvite,
  createTeam,
  deleteTeam,
  inviteTeamMember,
  leaveTeam,
  removeTeamMember,
  renameTeam,
  revokeTeamInvite,
  shareProjectWithTeam,
  teamStateForUser,
  transferTeamOwnership,
  unshareProjectFromTeam,
  updateTeamMemberRole,
} from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function messageFor(error: unknown) {
  const code = error instanceof Error ? error.message : String(error);
  const messages: Record<string, string> = {
    UNAUTHENTICATED: "Sign in to manage a team.",
    TEAM_PLAN_REQUIRED: "Unable to create a workspace right now.",
    TEAM_BUSINESS_ONLY:
      "Team is a business plan. Set up your Business profile first, then upgrade to Team.",
    TEAM_MEMBERS_ONLY: "Only joined team members can use this workspace.",
    TEAM_PLAN_INACTIVE: "This team workspace is not available right now.",
    ALREADY_IN_TEAM: "This account is already in a team.",
    TEAM_NAME_REQUIRED: "Give the team a name.",
    TEAM_NAME_CONFIRMATION: "Type the exact workspace name to confirm deletion.",
    INVALID_OWNER: "Choose another current member as the new owner.",
    NEW_OWNER_TEAM_PLAN_REQUIRED:
      "The new owner must have their own active Team plan before ownership can be transferred.",
    NEW_OWNER_BUSINESS_REQUIRED:
      "The new owner must be a Business account before ownership can be transferred.",
    FORBIDDEN: "You do not have permission to do that.",
    OWNER_ONLY: "Only the team owner can change that.",
    OWNER_ROLE_FIXED: "The owner role cannot be changed.",
    OWNER_CANNOT_BE_REMOVED: "The team owner cannot be removed.",
    OWNER_CANNOT_LEAVE: "Transfer ownership before leaving the team.",
    MEMBER_NOT_FOUND: "That team member no longer exists.",
    INVALID_EMAIL: "Enter a valid email address.",
    CANNOT_INVITE_SELF: "You are already in this team.",
    ALREADY_MEMBER: "That person is already a team member.",
    INVITE_NOT_FOUND: "That invitation no longer exists.",
    INVITE_EMAIL_MISMATCH: "This invitation belongs to a different email address.",
    INVITE_USED: "That invitation has already been used.",
    INVITE_EXPIRED: "That invitation has expired.",
    PROJECT_NOT_OWNED: "You can only share projects you own.",
    PROJECT_NOT_SHARED: "That project is not shared with this team.",
  };
  return messages[code] || (error instanceof Error ? error.message : "Request failed.");
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to view Team." }, { status: 401 });
  }

  const state = await teamStateForUser(user);
  return Response.json(state, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to manage Team." }, { status: 401 });
  }

  const limit = await consumeRateLimit({
    scope: "team-action",
    identity: user.id,
    limit: 90,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many team changes. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");

  try {
    let lastInvite: { id: string; path: string; link: string } | null = null;
    if (action === "create") {
      await createTeam(String(body?.name || ""));
    } else if (action === "invite") {
      lastInvite = await inviteTeamMember(
        String(body?.email || ""),
        body?.role === "admin" ? "admin" : "member",
      );
    } else if (action === "accept") {
      await acceptTeamInvite(String(body?.inviteId || ""));
    } else if (action === "role") {
      await updateTeamMemberRole(
        String(body?.memberUserId || ""),
        body?.role === "admin" ? "admin" : "member",
      );
    } else if (action === "remove") {
      await removeTeamMember(String(body?.memberUserId || ""));
    } else if (action === "leave") {
      await leaveTeam();
    } else if (action === "share-project") {
      await shareProjectWithTeam(String(body?.projectId || ""));
    } else if (action === "unshare-project") {
      await unshareProjectFromTeam(String(body?.projectId || ""));
    } else if (action === "revoke-invite") {
      await revokeTeamInvite(String(body?.inviteId || ""));
    } else if (action === "rename") {
      await renameTeam(String(body?.name || ""));
    } else if (action === "transfer-owner") {
      await transferTeamOwnership(String(body?.memberUserId || ""));
    } else if (action === "delete-team") {
      await deleteTeam(String(body?.confirmName || ""));
    } else {
      return Response.json({ error: "Unknown team action." }, { status: 400 });
    }

    const state = await teamStateForUser(user);
    return Response.json(lastInvite ? { ...state, lastInvite } : state);
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}
