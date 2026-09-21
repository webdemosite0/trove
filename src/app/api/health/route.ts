import { one, isRemote, ephemeral } from "@/lib/db";
import { searchProvider } from "@/lib/search";
import { mailerConfigured, mailTransport, mailFallback } from "@/lib/mail";
import { site } from "@/lib/site";
import { compatProviders } from "@/lib/openai-compat";
import { purchasable as stripePurchasable, stripeConfigured } from "@/lib/stripe";
import { lemonConfigured, lemonPurchasable } from "@/lib/lemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Configured AI backend labels (kept local so /api/health does not depend on ai.ts exports). */
function providerChain(): string[] {
  const labels: string[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) labels.push("Gemini");
  for (const p of compatProviders()) labels.push(p.label);
  return labels;
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function domainTail(host: string) {
  const parts = host.split(".").filter(Boolean);
  return parts.slice(-2).join(".");
}

function publishingIsolated() {
  const publishRoot = String(process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/$/, "");
  const appHost = hostnameOf(site.url);
  if (!publishRoot || !appHost) return false;
  return domainTail(publishRoot) !== domainTail(appHost);
}

function paidProReady() {
  return (
    (lemonPurchasable("pro", "month") && lemonPurchasable("pro", "year")) ||
    (stripePurchasable("pro", "month") && stripePurchasable("pro", "year"))
  );
}

/**
 * Says why the app is unhappy, without a dashboard login.
 *
 * Next hides server errors in production and Vercel does not surface the
 * message, so a misconfigured database looks identical to a code bug: every
 * page just returns 500. This reports which mode the database is in and
 * whether it can actually be reached.
 *
 * Deliberately leaks nothing: no connection string, no token, no row data —
 * only booleans, and the error text if a query fails.
 */
export async function GET() {
  const configured = {
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    aiProviders: providerChain(),
    searchProvider: searchProvider(),
    mail: mailTransport(),
    mailFallback: mailFallback(),
    tursoUrl: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
    tursoToken: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
    siteUrl: Boolean(
      process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    ),
    resolvedSiteUrl: site.url,
    e2b: Boolean(process.env.E2B_API_KEY?.trim()),
    sandboxTerminal: process.env.TROVE_SANDBOX_TERMINAL_ENABLED?.trim() === "1",
    opsAlerts: Boolean(process.env.TROVE_ALERT_WEBHOOK_URL?.trim()),
    sessionSecret: Boolean(process.env.TROVE_SECRET?.trim()),
    passwordRecovery: mailerConfigured(),
    paidPro: paidProReady(),
    publishingIsolated: publishingIsolated(),
    lemon: lemonConfigured(),
    stripe: stripeConfigured(),
    lemonWebhook: Boolean(process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
  };

  const modeNow = () =>
    isRemote ? "turso" : ephemeral ? "ephemeral-tmp" : "local-file";

  try {
    await one(`SELECT COUNT(*) AS n FROM users`);
    const durable = isRemote || !ephemeral;
    const missing: string[] = [];
    if (!durable) missing.push("durable database");
    if (!configured.sessionSecret) missing.push("TROVE_SECRET");
    if (!configured.siteUrl) missing.push("SITE_URL");
    if (!configured.aiProviders.length) missing.push("AI provider");
    if (!configured.e2b) missing.push("E2B preview");
    if (!configured.passwordRecovery) missing.push("transactional email / password recovery");
    if (!configured.paidPro) missing.push("monthly + yearly Pro billing");
    if (!configured.opsAlerts) missing.push("operations alert webhook");
    if (!configured.publishingIsolated) missing.push("separate publishing domain");

    return Response.json({
      ok: true,
      database: { mode: modeNow(), reachable: true, durable },
      configured,
      launchReadiness: {
        readyForGlobalPaidLaunch: missing.length === 0,
        missing,
      },
      ...(ephemeral
        ? {
            warning:
              "Running on a temporary filesystem. The app works, but accounts, " +
              "saved conversations and credits are lost whenever the instance " +
              "recycles. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to keep them.",
          }
        : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    const hint = isRemote
      ? "TURSO_DATABASE_URL is set but the database could not be queried. Check the URL and that TURSO_AUTH_TOKEN matches it."
      : "No Turso credentials are set, so Trove tried to write a SQLite file to local disk. That fails on Vercel and every other read-only host. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.";

    console.error("[health] database check failed", message);
    return Response.json(
      {
        ok: false,
        database: { mode: modeNow(), reachable: false },
        configured,
        error: "Database health check failed.",
        hint,
      },
      { status: 503 },
    );
  }
}
