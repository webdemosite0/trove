import { PasswordRecoveryCard } from "@/components/auth/password-recovery-card";

export const metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <PasswordRecoveryCard mode="reset" token={token || ""} />;
}
