import "server-only";

/**
 * Admin identity is email-based only — set via env, never from the client.
 *
 * ADMIN_EMAILS=you@gmail.com,other@gmail.com
 * or a single ADMIN_EMAIL=you@gmail.com
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
