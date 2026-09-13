import { notFound } from "next/navigation";
import { one, run } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public site served at {slug}.troveai.site via middleware rewrite to /s/{slug}.
 */
export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) notFound();

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS published_sites (
        slug TEXT PRIMARY KEY,
        title TEXT,
        html TEXT,
        files_json TEXT,
        user_id TEXT,
        updated_at INTEGER
      )`,
    );
  } catch {
    /* */
  }

  const row = await one(`SELECT * FROM published_sites WHERE slug = ?`, [slug]).catch(() => null);

  if (!row || !row.html) {
    return (
      <html lang="en">
        <head>
          <title>Not published — Trove</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body
          style={{
            fontFamily: "system-ui, sans-serif",
            padding: 48,
            background: "#0a0a0a",
            color: "#fafafa",
            minHeight: "100vh",
            margin: 0,
          }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Site not published</h1>
          <p style={{ opacity: 0.65, margin: 0, lineHeight: 1.5 }}>
            Publish from the Trove builder to go live at{" "}
            <code style={{ color: "#a5b4fc" }}>{slug}.troveai.site</code>.
          </p>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>{String(row.title || slug)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0 }}>
        <iframe
          title={String(row.title || slug)}
          srcDoc={String(row.html)}
          style={{ border: 0, width: "100%", height: "100vh", display: "block" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </body>
    </html>
  );
}
