import { getInstructions } from "@/lib/user-prefs";
import { currentUser } from "@/lib/auth";
import { SignedOut } from "@/components/settings/signed-out";
import { InstructionsForm } from "@/components/settings/instructions-form";

export const metadata = { title: "Custom instructions" };

export default async function InstructionsPage() {
  const user = await currentUser();
  if (!user) return <SignedOut />;
  const instructions = await getInstructions(user.id);
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Custom instructions</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">
        Preferences the AI follows in chat, tools, and the website builder — tone, name, always/never rules.
      </p>
      <div className="mt-6">
        <InstructionsForm initial={instructions} />
      </div>
    </div>
  );
}
