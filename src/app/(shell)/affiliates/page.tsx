import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { affiliateStatsFor } from "@/lib/affiliates";
import { AffiliatesView } from "@/components/settings/affiliates-view";

export const metadata = {
  title: "Affiliates",
  description: "Share Trove, earn referral credits, and track qualified paid referrals.",
};

export default async function AffiliatesPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/affiliates");

  const stats = await affiliateStatsFor(user.id);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <AffiliatesView stats={stats} name={user.name} />
    </div>
  );
}
