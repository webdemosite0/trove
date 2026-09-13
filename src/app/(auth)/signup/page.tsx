import { AuthCard } from "@/components/auth/auth-card";

/** Not indexed — see the note in the sign-in page. */
export const metadata = {
  title: "Sign up",
  robots: { index: false, follow: true },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthCard mode="signup" googleEnabled={true} oauthError={error} />;
}
