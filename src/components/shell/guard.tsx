import { redirect } from "next/navigation";
import { Backdrop } from "@/components/shell/backdrop";
import { SetupNeeded } from "@/components/shell/setup-needed";
import { currentUser, type User } from "@/lib/auth";
import { storageIsEphemeral, tursoVars } from "@/lib/db";

export type ShellGate =
  | { ok: true; user: User }
  | { ok: false; screen: React.ReactNode };

export async function resolveShell(): Promise<ShellGate> {
  let user: User | null = null;
  try {
    user = await currentUser();
  } catch (e) {
    const digest = (e as { digest?: unknown })?.digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
    ) {
      throw e;
    }

    const message = e instanceof Error ? e.message : String(e);
    console.error("shell guard: database unavailable —", message);

    const seen = tursoVars();
    return {
      ok: false,
      screen: (
        <>
          <Backdrop />
          <SetupNeeded
            detail={[
              message,
              "",
              `TURSO_DATABASE_URL: ${seen.url ? "set" : "NOT SET"}`,
              `TURSO_AUTH_TOKEN:   ${seen.token ? "set" : "NOT SET"}`,
            ].join("\n")}
          />
        </>
      ),
    };
  }

  if (await storageIsEphemeral()) {
    return {
      ok: false,
      screen: (
        <>
          <Backdrop />
          <SetupNeeded
            reason="ephemeral"
            detail={[
              "database mode: ephemeral-tmp",
              `TURSO_DATABASE_URL: ${tursoVars().url ? "set" : "NOT SET"}`,
              `TURSO_AUTH_TOKEN:   ${tursoVars().token ? "set" : "NOT SET"}`,
            ].join("\n")}
          />
        </>
      ),
    };
  }

  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");
  // Mandatory product onboarding before any workspace surface
  if (!user.onboardingDone) redirect("/onboarding");

  return { ok: true, user };
}
