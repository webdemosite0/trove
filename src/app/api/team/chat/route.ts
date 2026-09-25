import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  sendTeamChatMessage,
  teamChatStateForUser,
} from "@/lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function messageFor(error: unknown) {
  const code = error instanceof Error ? error.message : String(error);
  if (code === "TEAM_MEMBERS_ONLY") return "Join a Team workspace to use Team chat.";
  if (code === "TEAM_PLAN_INACTIVE") return "Team chat is paused until the Team plan is active again.";
  if (code === "EMPTY_MESSAGE") return "Write a message first.";
  return "Team chat is unavailable right now.";
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to use Team chat." }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 80);

  try {
    const state = await teamChatStateForUser(user, Number.isFinite(limit) ? limit : 80);
    return Response.json(
      { ...state, currentUserId: user.id },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    const status =
      code === "TEAM_MEMBERS_ONLY"
        ? 404
        : code === "TEAM_PLAN_INACTIVE"
          ? 423
          : 500;
    return Response.json({ error: messageFor(error) }, { status });
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to use Team chat." }, { status: 401 });
  }

  const rate = await consumeRateLimit({
    scope: "team-chat-message",
    identity: user.id,
    limit: 120,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });

  if (!rate.allowed) {
    return Response.json(
      { error: "You are sending messages too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const text = String(body?.text || "");

  try {
    const message = await sendTeamChatMessage(user, text);
    return Response.json({ message });
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    const status =
      code === "TEAM_MEMBERS_ONLY"
        ? 404
        : code === "TEAM_PLAN_INACTIVE"
          ? 423
          : code === "EMPTY_MESSAGE"
            ? 400
            : 500;
    return Response.json({ error: messageFor(error) }, { status });
  }
}
