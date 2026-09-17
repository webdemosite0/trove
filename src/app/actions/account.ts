"use server";

import { redirect } from "next/navigation";
import { currentUser, endSession } from "@/lib/auth";
import { entitled, subscriptionFor } from "@/lib/billing";
import { batch, run } from "@/lib/db";

/**
 * Permanently removes the signed-in Trove account and first-party workspace data.
 *
 * Billing must be inactive first. We deliberately do not orphan a paid
 * subscription by deleting the local account before the payment provider has
 * stopped future renewal.
 */
export async function deleteAccount(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const confirmation = String(form.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();

  if (confirmation !== user.email.toLowerCase()) {
    redirect("/settings/account?delete=confirm");
  }

  const sub = await subscriptionFor(user.id).catch(() => ({
    customerId: "",
    subscriptionId: "",
    status: "",
    endsAt: null,
  }));

  const status = sub.status.toLowerCase();
  const stillBillable =
    user.plan !== "free" ||
    entitled(status) ||
    Boolean(
      sub.subscriptionId &&
        !["canceled", "cancelled", "expired", "unpaid", "incomplete_expired"].includes(status),
    );

  if (stillBillable) {
    redirect("/settings/account?delete=billing");
  }

  // Analytics is lazily created and may not exist on very old/self-hosted
  // databases, so remove it best-effort before the transactional core cleanup.
  await run("DELETE FROM analytics_events WHERE user_id = ?", [user.id]).catch(() => 0);

  // Delete children explicitly instead of relying only on SQLite foreign-key
  // cascade settings, which can differ across local SQLite and hosted libSQL.
  await batch([
    {
      sql: `DELETE FROM builder_artifact_versions
             WHERE artifact_id IN (
               SELECT a.id FROM builder_artifacts a
               JOIN builder_projects p ON p.id = a.project_id
               WHERE p.user_id = ?
             )`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM builder_artifacts
             WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM builder_agent_runs
             WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM builder_approvals
             WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM builder_deployments
             WHERE project_id IN (SELECT id FROM builder_projects WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM mission_events
             WHERE mission_id IN (SELECT id FROM missions WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM mission_tasks
             WHERE mission_id IN (SELECT id FROM missions WHERE user_id = ?)`,
      args: [user.id],
    },
    {
      sql: `DELETE FROM messages
             WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)`,
      args: [user.id],
    },
    { sql: "DELETE FROM builder_projects WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM builder_brand_profiles WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM missions WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM conversations WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM agents WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM sites WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM reminders WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM recents WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM credit_spends WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM credit_grants WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM connections WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM integrations WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM auth_tokens WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM sessions WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM users WHERE id = ?", args: [user.id] },
  ]);

  await endSession();
  redirect("/?account=deleted");
}
