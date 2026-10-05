import { currentUser } from "@/lib/auth";
import { getProfile } from "@/app/actions/profile";
import { getBusinessProfile } from "@/lib/business-profile";
import { getManualInstructions } from "@/lib/user-prefs";
import { subscriptionFor } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Account data for the Settings overlay on routes whose layout doesn't fetch
 * it server-side (creation routes mount SettingsHost without settingsData —
 * see the studio layout). Same payload and same catch-to-null fallbacks as the
 * shell layout, so the Settings dialog agrees with itself on every route and a
 * signed-in user never sees the signed-out copy.
 *
 * Defect 3 (P2): the Settings dialog used to show "Sign in to edit your
 * profile" on creation routes while simultaneously identifying the signed-in
 * account — because settingsData was simply absent, not because there was no
 * session. The host now fetches this route and renders a loading skeleton
 * until it arrives.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in" }, { status: 401 });
  }

  const [profile, businessProfile, manualInstructions, subscription] =
    await Promise.all([
      getProfile().catch(() => null),
      getBusinessProfile(user.id).catch(() => null),
      getManualInstructions(user.id).catch(() => ""),
      subscriptionFor(user.id).catch(() => null),
    ]);

  return Response.json(
    { profile, businessProfile, manualInstructions, subscription },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
