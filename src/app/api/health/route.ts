import { one, isRemote, ephemeral } from "@/lib/db";
import { searchProvider } from "@/lib/search";
import { mailTransport, mailFallback } from "@/lib/mail";
import { site } from "@/lib/site";
import { compatProviders } from "@/lib/openai-compat";
import { opsAlertsConfigured } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Configured AI backend labels (kept local so /api/health does not depend on ai.ts exports). */
function providerChain(): string[] {
  const labels: string[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) labels.push("Gemini");
  for (const p of compatProviders()) labels.push(p.label);
  return labels;
}

function billingProviders() {
  const providers: string[] = [];
  if (
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
    process.env.LEMONSQUEEZY_STORE_ID?.trim()
  ) {
    providers.push("lemon");
  }
  if (process.env.STRIPE_SECRET_KEY?.trim()) providers.push("stripe");
  return providers;
}

export async function GET() {
  const aiProviders = providerChain();
  const billing = billingProviders();
  const configured = {
    ai: aiProviders.length > 0,
    aiProviders,
    searchProvider: searchProvider(),
    mail: mailTransport(),
    mailFallback: mailFallback(),
    database: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
    e2b: Boolean(process.env.E2B_API_KEY?.trim()),
    billing,
    billingWebhook:
      Boolean(process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()) ||
      Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    opsAlerts: opsAlertsConfigured(),
    publishRoot: Boolean(process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN?.trim()),
    siteUrl: Boolean(
      process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    ),
  };

  const modeNow = () =>
    isRemote ? "turso" : ephemeral ? "ephemeral-tmp" : "local-file";

  try {
    await one(`SELECT COUNT(*) AS n FROM users`);
    const durable = isRemote || !ephemeral;
    const warnings: string[] = [];
    if (!durable) warnings.push("database_not_durable");
    if (!configured.ai) warnings.push("ai_provider_missing");
    if (!configured.e2b) warnings.push("site_preview_runtime_missing");
    if (billing.length > 0 && !configured.billingWebhook) {
      warnings.push("billing_webhook_missing");
    }
    if (!configured.opsAlerts) warnings.push("ops_alerts_missing");

    return Response.json(
      {
        ok: true,
        status: warnings.length ? "degraded" : "healthy",
        database: { mode: modeNow(), reachable: true, durable },
        configured,
        warnings,
        service: { name: site.name, url: site.url },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("health: database check failed", detail);
    return Response.json(
      {
        ok: false,
        status: "unhealthy",
        database: { mode: modeNow(), reachable: false, durable: false },
        configured,
        errorCode: "database_unreachable",
        service: { name: site.name, url: site.url },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
