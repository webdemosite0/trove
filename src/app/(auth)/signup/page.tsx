import { AuthCard } from "@/components/auth/auth-card";
import { googleConfigured } from "@/lib/google";
import { microsoftConfigured } from "@/lib/microsoft";

/** Not indexed — see the note in the sign-in page. */
export const metadata = {
  title: "Sign up",
  robots: { index: false, follow: true },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const { error, ref } = await searchParams;
  return (
    <AuthCard
      mode="signup"
      googleEnabled={googleConfigured()}
      microsoftEnabled={microsoftConfigured()}
      oauthError={error}
      referralCode={ref}
    />
  );
}
