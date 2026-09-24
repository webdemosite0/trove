import "server-only";

import { one, str } from "@/lib/db";

export type AccountType = "business" | "individual" | "student";

export interface AccountProfile {
  accountType: AccountType;
  businessEligible: boolean;
  businessName: string;
}

function parseMeta(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function accountProfileForUser(
  userId: string,
): Promise<AccountProfile> {
  const row = await one(
    "SELECT plan, onboarding_meta FROM users WHERE id = ?",
    [userId],
  ).catch(() => null);

  const meta = parseMeta(str(row?.onboarding_meta));
  const stored = String(meta.accountType || "").toLowerCase();
  const businessName = String(meta.businessName || "").trim();
  const businessUrl = String(meta.businessUrl || "").trim();

  const hasExplicitType =
    stored === "business" || stored === "student" || stored === "individual";

  let accountType: AccountType;
  if (hasExplicitType) {
    accountType = stored as AccountType;
  } else if (businessName || businessUrl || str(row?.plan) === "team") {
    // Backward compatibility for accounts created before account type existed.
    accountType = "business";
  } else {
    accountType = "individual";
  }

  // Business context is useful to any account, but it does not override an
  // explicit Student/Individual classification. Team ownership is reserved for
  // explicit Business accounts. Existing Team owners stay eligible.
  const businessEligible =
    accountType === "business" || str(row?.plan) === "team";

  return { accountType, businessEligible, businessName };
}

export async function canOwnTeamPlan(userId: string) {
  return (await accountProfileForUser(userId)).businessEligible;
}


export async function setAccountTypeForUser(
  userId: string,
  accountType: AccountType,
) {
  const row = await one(
    "SELECT onboarding_meta FROM users WHERE id = ?",
    [userId],
  ).catch(() => null);
  const meta = parseMeta(str(row?.onboarding_meta));
  const next = JSON.stringify({
    ...meta,
    accountType,
    accountTypeUpdatedAt: Date.now(),
  });
  const { run } = await import("@/lib/db");
  await run("UPDATE users SET onboarding_meta = ? WHERE id = ?", [next, userId]);
}
