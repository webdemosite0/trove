import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminView } from "./admin-view";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return <AdminView email={user.email} />;
}
