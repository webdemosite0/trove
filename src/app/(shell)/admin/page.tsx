import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminView } from "./admin-view";

export const metadata = { title: "Admin · Trove" };

function isAdmin(email: string, plan: string) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (plan === "admin") return true;
  if (allow.length && allow.includes(email.toLowerCase())) return true;
  return false;
}

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.emailVerified) redirect("/verify-email?next=/admin");
  if (!isAdmin(user.email, user.plan)) redirect("/dashboard");
  return <AdminView email={user.email} />;
}
