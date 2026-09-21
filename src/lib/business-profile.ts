import "server-only";

import { currentUser } from "@/lib/auth";
import { one, run, str } from "@/lib/db";

export interface BusinessProfile {
  businessName: string;
  businessUrl: string;
  businessProfileName: string;
  businessAnalysis: string;
  industry: string;
  audience: string;
  voice: string;
  instructions: string;
}

function emptyProfile(): BusinessProfile {
  return {
    businessName: "",
    businessUrl: "",
    businessProfileName: "",
    businessAnalysis: "",
    industry: "",
    audience: "",
    voice: "",
    instructions: "",
  };
}

function parseMeta(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function getBusinessProfile(userId?: string): Promise<BusinessProfile> {
  const user = userId ? { id: userId } : await currentUser();
  if (!user) return emptyProfile();

  const row = await one(
    "SELECT onboarding_meta FROM users WHERE id = ?",
    [user.id],
  ).catch(() => null);
  if (!row) return emptyProfile();

  const meta = parseMeta(str(row.onboarding_meta));
  return {
    businessName: String(meta.businessName || ""),
    businessUrl: String(meta.businessUrl || ""),
    businessProfileName: String(meta.businessProfileName || ""),
    businessAnalysis: String(meta.businessAnalysis || ""),
    industry: String(meta.businessIndustry || ""),
    audience: String(meta.businessAudience || ""),
    voice: String(meta.businessVoice || ""),
    instructions: String(meta.businessInstructions || ""),
  };
}

export async function updateBusinessProfile(
  userId: string,
  patch: Partial<BusinessProfile>,
) {
  const row = await one(
    "SELECT onboarding_meta FROM users WHERE id = ?",
    [userId],
  ).catch(() => null);
  const meta = parseMeta(row ? str(row.onboarding_meta) : "");

  const next = {
    ...meta,
    ...(patch.businessName != null
      ? { businessName: patch.businessName.slice(0, 120) }
      : {}),
    ...(patch.businessUrl != null
      ? { businessUrl: patch.businessUrl.slice(0, 500) }
      : {}),
    ...(patch.businessProfileName != null
      ? { businessProfileName: patch.businessProfileName.slice(0, 180) }
      : {}),
    ...(patch.businessAnalysis != null
      ? { businessAnalysis: patch.businessAnalysis.slice(0, 1200) }
      : {}),
    ...(patch.industry != null
      ? { businessIndustry: patch.industry.slice(0, 120) }
      : {}),
    ...(patch.audience != null
      ? { businessAudience: patch.audience.slice(0, 300) }
      : {}),
    ...(patch.voice != null
      ? { businessVoice: patch.voice.slice(0, 220) }
      : {}),
    ...(patch.instructions != null
      ? { businessInstructions: patch.instructions.slice(0, 2600) }
      : {}),
    businessUpdatedAt: Date.now(),
  };

  await run(
    "UPDATE users SET onboarding_meta = ? WHERE id = ?",
    [JSON.stringify(next), userId],
  );
}
