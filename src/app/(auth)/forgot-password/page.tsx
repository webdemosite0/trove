import { PasswordRecoveryCard } from "@/components/auth/password-recovery-card";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <PasswordRecoveryCard mode="request" />;
}
