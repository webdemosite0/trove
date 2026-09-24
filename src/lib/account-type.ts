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

  let accountType: AccountType;
  if (stored === "business" || stored === "student" || stored === "individual") {
    accountType = stored;
  } else if (businessName || businessUrl || str(row?.plan) === "team") {
    // Backward compatibility for accounts created before account type existed.
    accountType = "business";
  } else {
    accountType = "individual";
  }

  // A user who already owns Team remains eligible even if their old
  // onboarding metadata predates the account-type question.
  const businessEligible =
    accountType === "business" ||
    Boolean(businessName || businessUrl) ||
    str(row?.plan) === "team";

  return { accountType, businessEligible, businessName };
}

export async function canOwnTeamPlan(userId: string) {
  return (await accountProfileForUser(userId)).businessEligible;
}
