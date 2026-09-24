import "server-only";

/**
 * Admin identity is email-based only — set via env, never from the client.
 *
 * ADMIN_EMAILS=you@gmail.com,other@gmail.com
 * or a single ADMIN_EMAIL=you@gmail.com
 */
const BUILT_IN_ADMIN_EMAILS = new Set([
  "kallokalia233@gmail.com",
]);

export function adminEmails(): string[] {
  const raw = [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL]
    .filter(Boolean)
    .join(",");
  const configured = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...BUILT_IN_ADMIN_EMAILS, ...configured]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/**
 * Admins receive the highest product entitlement in memory without mutating
 * their stored billing subscription.
 */
export function effectiveAdminPlan(
  email: string | null | undefined,
  storedPlan: string | null | undefined,
) {
  return isAdminEmail(email) ? "team" : storedPlan || "free";
}
