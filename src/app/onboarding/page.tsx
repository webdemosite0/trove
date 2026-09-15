import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { OnboardingFlow } from "@/components/onboarding/flow";

export const metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.onboardingDone) redirect("/chat");

  return <OnboardingFlow name={user.name} email={user.email} />;
}
