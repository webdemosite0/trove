import { getManualInstructions } from "@/lib/user-prefs";
import { currentUser } from "@/lib/auth";
import { SignedOut } from "@/components/settings/signed-out";
import { InstructionsForm } from "@/components/settings/instructions-form";

export const metadata = { title: "Custom instructions" };

export default async function InstructionsPage() {
  const user = await currentUser();
  if (!user) return <SignedOut />;
  const instructions = await getManualInstructions(user.id);
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Custom instructions</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">
        Your existing personal rules stay here. Business context is maintained automatically from Settings → Business and is preserved when you edit these instructions.
      </p>
      <div className="mt-6">
        <InstructionsForm initial={instructions} />
      </div>
    </div>
  );
}
