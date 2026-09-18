import { loadProject } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return new Response("Missing project.", { status: 400 });

  const project = await loadProject(id).catch(() => null);
  if (!project) return new Response("Not found.", { status: 404 });

  const html =
    project.previewHtml ||
    project.files.find((file) => /(^|\/)index\.html$/i.test(file.path))?.content ||
    `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#fff;color:#111827}
main{min-height:100vh;padding:8vw;background:radial-gradient(circle at 80% 12%,#eef2ff,transparent 30%),#fff}
nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:12vh;font-size:14px}
.logo{font-weight:750;letter-spacing:-.03em}.pill{border:1px solid #e5e7eb;border-radius:999px;padding:8px 14px}
h1{max-width:760px;margin:0;font-size:clamp(42px,7vw,88px);line-height:.98;letter-spacing:-.055em}
p{max-width:620px;margin:26px 0 0;color:#667085;font-size:20px;line-height:1.5}
</style>
</head>
<body>
<main>
<nav><span class="logo">${escapeHtml(project.name)}</span><span class="pill">Preview</span></nav>
<h1>${escapeHtml(project.name)}</h1>
<p>${escapeHtml(project.prompt || "Built with Trove")}</p>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:; media-src data: https:;",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
