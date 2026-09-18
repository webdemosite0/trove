import { loadProject } from "@/lib/projects";
import { bundle } from "@/lib/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const project = await loadProject(String(id || "").trim());

  if (!project) {
    return new Response("<!doctype html><html><body></body></html>", {
      status: 404,
      headers: previewHeaders(),
    });
  }

  let html = project.previewHtml?.trim() || "";
  if (!html || isViteShell(html)) {
    html = bundle(project.files) || html;
  }

  if (!html.trim()) {
    html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#0b0d12"></body></html>`;
  }

  return new Response(html, {
    status: 200,
    headers: previewHeaders(),
  });
}

function isViteShell(html: string): boolean {
  return (
    /type=["']module["']/i.test(html) &&
    (/src\/main\.(jsx|tsx|js)/i.test(html) || /\/src\//i.test(html)) &&
    !/<h1|<section|<main|class=["'][^"']*hero/i.test(html)
  );
}

function previewHeaders(): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads; " +
      "frame-ancestors 'self'; default-src 'self' data: blob: https:; " +
      "script-src 'unsafe-inline' 'unsafe-eval' blob: https:; " +
      "style-src 'unsafe-inline' https:; img-src data: blob: https:; " +
      "font-src data: https:; connect-src https: wss:; media-src data: blob: https:",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
