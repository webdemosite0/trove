import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { affiliateStatsFor } from "@/lib/affiliates";
import { AffiliatesView } from "@/components/settings/affiliates-view";

export const metadata = { title: "Affiliates" };

export default async function AffiliatesPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/settings/affiliates");
  const stats = await affiliateStatsFor(user.id);
  return <AffiliatesView stats={stats} name={user.name} />;
}
