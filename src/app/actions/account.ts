"use server";

import { redirect } from "next/navigation";
import { currentUser, endSession } from "@/lib/auth";
import { subscriptionFor, entitled } from "@/lib/billing";
import { run } from "@/lib/db";

export type DeleteAccountState = { error?: string };

async function tryRun(sql: string, args: string[] = []) {
  try {
    await run(sql, args);
  } catch {
    // Some tables are created lazily or only exist on newer deployments.
  }
}

export async function deleteAccount(
  _prev: DeleteAccountState,
  form: FormData,
): Promise<DeleteAccountState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in again before deleting your account." };

  const confirmation = String(form.get("confirmation") || "").trim();
  if (confirmation !== "DELETE MY ACCOUNT") {
    return { error: 'Type "DELETE MY ACCOUNT" exactly to confirm.' };
  }

  const subscription = await subscriptionFor(user.id).catch(() => null);
  if (
    user.plan !== "free" ||
    (subscription?.status && entitled(subscription.status))
  ) {
    return {
      error:
        "Cancel your paid subscription first. When the account is back on Free, you can permanently delete it here.",
    };
  }

  const id = user.id;

  // Delete child rows explicitly as well as relying on foreign-key cascades.
  // This keeps deletion complete even on older/local SQLite deployments.
  await tryRun(
    "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)",
    [id],
  );
  await tryRun(
    "DELETE FROM mission_events WHERE mission_id IN (SELECT id FROM missions WHERE user_id = ?)",
    [id],
  );
  await tryRun(
    "DELETE FROM mission_tasks WHERE mission_id IN (SELECT id FROM missions WHERE user_id = ?)",
    [id],
  );
  await tryRun(
    "DELETE FROM builder_artifact_versions WHERE artifact_id IN (SELECT id FROM builder_artifacts WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?))",
    [id],
  );
  await tryRun(
    "DELETE FROM builder_artifacts WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)",
    [id],
  );
  for (const table of [
    "builder_agent_runs",
    "builder_approvals",
    "builder_deployments",
  ]) {
    await tryRun(
      `DELETE FROM ${table} WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)`,
      [id],
    );
  }

  for (const table of [
    "published_domain_claims",
    "published_deployments",
    "published_sites",
    "auth_tokens",
    "sessions",
    "agents",
    "sites",
    "reminders",
    "recents",
    "conversations",
    "credit_grants",
    "credit_spends",
    "connections",
    "integrations",
    "missions",
    "builder_projects",
    "builder_brand_profiles",
    "analytics_events",
  ]) {
    await tryRun(`DELETE FROM ${table} WHERE user_id = ?`, [id]);
  }

  await run("DELETE FROM users WHERE id = ?", [id]);
  await endSession().catch(() => undefined);
  redirect("/?account=deleted");
}
