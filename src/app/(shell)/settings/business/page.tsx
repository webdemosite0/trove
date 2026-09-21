import { currentUser } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/business-profile";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { SignedOut } from "@/components/settings/signed-out";

export const metadata = { title: "Business profile" };

export default async function BusinessSettingsPage() {
  const user = await currentUser();
  if (!user) return <SignedOut />;

  const profile = await getBusinessProfile(user.id);

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Company context</p>
      <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">Business</h1>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Keep Trove aligned with the business it is working for. This uses the same analyzer as onboarding and automatically updates the business section of your AI instructions.
      </p>
      <div className="mt-6">
        <BusinessProfileForm initial={profile} />
      </div>
    </div>
  );
}
