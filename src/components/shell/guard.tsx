import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { SetupNeeded } from "@/components/shell/setup-needed";
import { currentUser, type User } from "@/lib/auth";
import { storageIsEphemeral, tursoVars } from "@/lib/db";
import { balanceFor } from "@/lib/credits";
import type { Balance } from "@/lib/types";

/**
 * Pages a visitor may open without an account (P4: build before signup).
 * Kept in sync with PUBLIC_PAGES in src/middleware.ts — middleware lets the
 * request through, and the guard lets the layout render instead of bouncing
 * to /login. Creating anything still requires a session.
 */
const ANONYMOUS_BUILD_PATHS = new Set(["/tros/new"]);

export type ShellGate =
  | { ok: true; user: User | null; balance: Balance | null }
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

  if (!user) {
    // Anonymous build entry: render the guest-friendly page instead of
    // bouncing to /login. Everything that writes still requires a session.
    let pathname: string | null = null;
    try {
      pathname = (await headers()).get("x-invoke-path");
    } catch {
      pathname = null;
    }
    if (pathname && ANONYMOUS_BUILD_PATHS.has(pathname)) {
      return { ok: true, user: null, balance: null };
    }
    redirect("/login");
  }
  if (!user.emailVerified) redirect("/verify-email");
  if (!user.onboardingDone) redirect("/onboarding");

  let balance: Balance | null = null;
  try {
    balance = await balanceFor(user.id, user.plan, { email: user.email });
  } catch (e) {
    console.error("shell guard: balance load failed —", e);
  }

  return { ok: true, user, balance };
}
