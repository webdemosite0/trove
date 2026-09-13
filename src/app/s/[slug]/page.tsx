import { notFound } from "next/navigation";
import { one, run } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public site at {slug}.troveai.site (middleware rewrites → /s/{slug}).
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

  let html = row?.html ? String(row.html) : "";
  if (!html && row?.files_json) {
    try {
      const files = JSON.parse(String(row.files_json)) as { path: string; content: string }[];
      const index = files.find(
        (f) => f.path === "index.html" || f.path.endsWith("/index.html"),
      );
      if (index?.content) {
        html = index.content;
      } else {
        const app = files.find((f) => /App\.(jsx|tsx|js)$/i.test(f.path));
        const css = files.find((f) => /\.css$/i.test(f.path));
        if (app) {
          const code = app.content
            .replace(/export default function App/, "function App")
            .replace(/export default App/, "");
          html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${String(row?.title || slug)}</title><script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>${css ? `<style>${css.content}</style>` : ""}</head><body><div id="root"></div><script type="text/babel">${code}\nconst root = document.getElementById("root");\nif (root && typeof App !== "undefined") ReactDOM.createRoot(root).render(React.createElement(App));\n</script></body></html>`;
        }
      }
    } catch {
      /* */
    }
  }

  if (!row || !html) {
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
            No live build for <code style={{ color: "#a5b4fc" }}>{slug}.troveai.site</code>.
            Publish again from Trove Sites.
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
          srcDoc={html}
          style={{ border: 0, width: "100%", height: "100vh", display: "block" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </body>
    </html>
  );
}
