import { AuthCard } from "@/components/auth/auth-card";
import { googleConfigured } from "@/lib/google";
import { microsoftConfigured } from "@/lib/microsoft";
import { appleConfigured } from "@/lib/apple";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; verified?: string }>;
}) {
  const { error, next, verified } = await searchParams;

  return (
    <AuthCard
      mode="login"
      googleEnabled={googleConfigured()}
      microsoftEnabled={microsoftConfigured()}
      appleEnabled={appleConfigured()}
      oauthError={error}
      next={next}
      justVerified={verified === "1"}
    />
  );
}
