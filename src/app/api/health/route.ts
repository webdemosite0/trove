import { one, isRemote, ephemeral } from "@/lib/db";
import { searchProvider } from "@/lib/search";
import { mailTransport, mailFallback } from "@/lib/mail";
import { site } from "@/lib/site";
import { compatProviders } from "@/lib/openai-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Configured AI backend labels (kept local so /api/health does not depend on ai.ts exports). */
function providerChain(): string[] {
  const labels: string[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) labels.push("Gemini");
  for (const p of compatProviders()) labels.push(p.label);
  return labels;
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
  };

  const modeNow = () =>
    isRemote ? "turso" : ephemeral ? "ephemeral-tmp" : "local-file";

  try {
    await one(`SELECT COUNT(*) AS n FROM users`);
    return Response.json({
      ok: true,
      database: { mode: modeNow(), reachable: true, durable: isRemote || !ephemeral },
      configured,
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

    return Response.json(
      { ok: false, database: { mode: modeNow(), reachable: false }, configured, error: message, hint },
      { status: 503 },
    );
  }
}
