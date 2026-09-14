import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col justify-center px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.15), transparent 60%)",
        }}
      />
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Welcome to Trove</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          A few optional questions so we can tailor your workspace.
        </p>
      </div>
      <OnboardingForm name={user.name} />
    </div>
  );
}
