import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminView } from "./admin-view";

export const dynamic = "force-dynamic";

/**
 * Admin is never "just a route". Access requires:
 * 1. Signed-in session
 * 2. emailVerified === true
 * 3. email listed in ADMIN_EMAILS (comma-separated env)
 */
function isAdminEmail(email: string) {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return false;
  return list.includes(email.toLowerCase());
}

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.emailVerified) {
    redirect("/verify-email?next=/admin");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return <AdminView email={user.email} />;
}
