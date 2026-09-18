import { currentUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { ensureProjectColumns } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = Record<string, unknown>;

async function safeAll(sql: string, args: Array<string | number> = []): Promise<Row[]> {
  try {
    return await all<Row>(sql, args);
  } catch {
    return [];
  }
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to export your Trove data." }, { status: 401 });
  }

  await ensureProjectColumns().catch(() => undefined);

  const profile = await one<Row>(
    `SELECT id, email, name, plan, created_at, email_verified, provider, bio,
            onboarding_done, onboarding_meta, subscription_status, subscription_ends_at
       FROM users
      WHERE id = ?`,
    [user.id],
  );

  const [
    conversations,
    messages,
    agents,
    sites,
    reminders,
    recents,
    projects,
    brandProfiles,
    missions,
    missionTasks,
    missionEvents,
    integrations,
    connections,
    creditGrants,
    creditSpends,
    analytics,
  ] = await Promise.all([
    safeAll(
      `SELECT id, kind, title, created_at, updated_at
         FROM conversations
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT m.id, m.conversation_id, m.role, m.text, m.seq, m.created_at
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
        WHERE c.user_id = ?
        ORDER BY m.conversation_id, m.seq ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, name, role, instructions, tools, accent, created_at
         FROM agents
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, name, prompt, html, created_at
         FROM sites
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, title, note, due_at, done, notified, created_at
         FROM reminders
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, name, prompt, target, status, files_json, conversation_id,
              build_plan_json, completed_steps_json, messages_json, created_at, updated_at
         FROM builder_projects
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, name, colors, typography, rules, created_at, updated_at
         FROM builder_brand_profiles
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, goal, title, status, created_at, updated_at
         FROM missions
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT t.id, t.mission_id, t.seq, t.role, t.title, t.status, t.output,
              t.started_at, t.finished_at
         FROM mission_tasks t
         JOIN missions m ON m.id = t.mission_id
        WHERE m.user_id = ?
        ORDER BY t.mission_id, t.seq ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT e.id, e.mission_id, e.at, e.kind, e.actor, e.text
         FROM mission_events e
         JOIN missions m ON m.id = e.mission_id
        WHERE m.user_id = ?
        ORDER BY e.mission_id, e.at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT service, connected_at
         FROM integrations
        WHERE user_id = ?
        ORDER BY service ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT service, kind, account, hint, verified_at
         FROM connections
        WHERE user_id = ?
        ORDER BY service ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT period, plan, credits, created_at
         FROM credit_grants
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT id, kind, tokens, credits, period, created_at
         FROM credit_spends
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
    safeAll(
      `SELECT event, path, properties, created_at
         FROM analytics_events
        WHERE user_id = ?
        ORDER BY created_at ASC`,
      [user.id],
    ),
  ]);

  const payload = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    product: "Trove",
    note:
      "This export intentionally excludes password hashes, session tokens, payment credentials, API keys, and connected-app secrets.",
    account: profile ?? {
      email: user.email,
      name: user.name,
      plan: user.plan,
      provider: user.provider,
    },
    conversations,
    messages,
    agents,
    sites,
    reminders,
    recents,
    builder: {
      projects,
      brandProfiles,
    },
    missions: {
      items: missions,
      tasks: missionTasks,
      events: missionEvents,
    },
    connections,
    integrations,
    usage: {
      grants: creditGrants,
      spends: creditSpends,
    },
    analytics,
  };

  const body = JSON.stringify(payload, jsonReplacer, 2);
  const day = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trove-data-${day}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
