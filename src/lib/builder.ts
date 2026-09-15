/** Shared shapes for the builder, used by both the view and its panels. */

export interface ProjectFile {
  path: string;
  content: string;
}

export type TaskKind = "skill" | "read" | "write" | "check" | "think" | "plan";

export interface Task {
  id: string;
  kind: TaskKind;
  label: string;
  state: "run" | "ok" | "fail";
}

export interface LogLine {
  id: number;
  text: string;
  level: "info" | "warn" | "ok";
  at: string;
}

export interface Question {
  id: string;
  label: string;
  hint: string;
  options: string[];
}

/** How much the planner should attempt. Deep costs more and builds more. */
export type Depth = "quick" | "deep";

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  skills: string[];
  files: string[];
}

export interface BuildPlan {
  title: string;
  summary: string;
  requirements: {
    overview: string;
    features: string[];
    pages: { name: string; purpose: string }[];
    rules: string[];
  };
  style: { name: string; mood: string; palette: string[]; type: string };
  steps: PlanStep[];
}

/**
 * Inlines siblings into index.html so the preview renders from a single
 * srcdoc string. Relative CSS/JS links are inlined (iframe has no real origin).
 * Vite/React shells fall through to a CDN React preview of App.jsx.
 */
export function bundle(files: ProjectFile[], entry = "index.html"): string {
  const index =
    files.find((f) => f.path === entry) ??
    files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html")) ??
    files.find((f) => f.path.endsWith(".html"));

  if (index) {
    // Vite shells only mount #root and load /src/main.jsx — blank in srcdoc.
    const looksLikeViteShell =
      /type=["']module["']/i.test(index.content) &&
      (/src\/main\.(jsx|tsx|js)/i.test(index.content) || /\/src\//i.test(index.content)) &&
      !/<h1|<section|<main|class=["'][^"']*hero/i.test(index.content);

    if (looksLikeViteShell) {
      const react = reactCdnPreview(files);
      if (react) return react;
    }

    let html = index.content;
    const basename = (p: string) => p.split("/").pop() || p;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    for (const f of files) {
      if (f === index) continue;
      const name = basename(f.path);
      if (f.path.endsWith(".css") || name.endsWith(".css")) {
        const re = new RegExp(
          `<link[^>]*href=["'][^"']*${esc(name)}["'][^>]*>`,
          "gi",
        );
        if (re.test(html)) {
          html = html.replace(re, `<style>\n${f.content}\n</style>`);
        } else if (/<\/head>/i.test(html)) {
          html = html.replace(
            /<\/head>/i,
            `<style data-trove="${name}">\n${f.content}\n</style>\n</head>`,
          );
        } else {
          html = `<style>\n${f.content}\n</style>\n` + html;
        }
      }
      if (
        (f.path.endsWith(".js") && !f.path.endsWith(".jsx")) ||
        (name.endsWith(".js") && !name.endsWith(".jsx"))
      ) {
        const re = new RegExp(
          `<script[^>]*src=["'][^"']*${esc(name)}["'][^>]*>\s*</script>`,
          "gi",
        );
        if (re.test(html)) {
          html = html.replace(re, `<script>\n${f.content}\n</script>`);
        } else if (/<\/body>/i.test(html)) {
          html = html.replace(
            /<\/body>/i,
            `<script data-trove="${name}">\n${f.content}\n</script>\n</body>`,
          );
        } else {
          html = html + `\n<script>\n${f.content}\n</script>`;
        }
      }
    }
    return html;
  }

  return reactCdnPreview(files);
}

/** Strip ESM imports/exports so Babel standalone can run the file. */
function stripModules(src: string): string {
  return src
    .replace(/^import\s+[\s\S]*?from\s+["'][^"']+["']\s*;?\s*$/gm, "")
    .replace(/^import\s+["'][^"']+["']\s*;?\s*$/gm, "")
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/export\s+default\s+class\s+/g, "class ")
    .replace(/export\s+default\s+/g, "const __default = ")
    .replace(/export\s+(async\s+)?function\s+/g, "$1function ")
    .replace(/export\s+(const|let|var)\s+/g, "$1 ")
    .replace(/export\s+\{[^}]+\}\s*;?/g, "");
}

/** Best-effort in-browser preview for Vite/React file sets (no npm). */
function reactCdnPreview(files: ProjectFile[]): string {
  const app =
    files.find((f) => /(?:^|\/)App\.(jsx|tsx|js)$/i.test(f.path)) ??
    files.find((f) => /src\/main\.(jsx|tsx|js)$/i.test(f.path));
  if (!app) {
    // Last resort: any substantial HTML file
    const html = files.find((f) => f.path.endsWith(".html") && f.content.length > 80);
    return html?.content || "";
  }

  const css = files
    .filter((f) => f.path.endsWith(".css"))
    .map((f) => f.content)
    .join("\n");

  // Include other components before App so simple name references resolve.
  const others = files
    .filter(
      (f) =>
        f !== app &&
        /\.(jsx|tsx)$/i.test(f.path) &&
        !/main\.(jsx|tsx)$/i.test(f.path),
    )
    .map((f) => stripModules(f.content))
    .join("\n\n");

  let body = stripModules(app.content);

  if (!/const __App\s*=/.test(body) && /function\s+App\b/.test(body)) {
    body += "\nconst __App = App;\n";
  }
  if (!/const __App\s*=/.test(body) && /const __default\s*=/.test(body)) {
    body += "\nconst __App = __default;\n";
  }
  if (!/const __App\s*=/.test(body)) {
    body += "\nconst __App = typeof App !== 'undefined' ? App : () => null;\n";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Preview</title>
<style>
  html, body, #root { margin: 0; min-height: 100%; }
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
${css}
</style>
<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.development.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${others}
${body}
const rootEl = document.getElementById("root");
if (rootEl && typeof ReactDOM !== "undefined" && typeof React !== "undefined") {
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(__App));
}
<\/script>
</body>
</html>`;
}

/** Merges freshly written files over the existing set, preserving order. */
export function mergeFiles(prev: ProjectFile[], next: ProjectFile[]): ProjectFile[] {
  const out = [...prev];
  for (const f of next) {
    const i = out.findIndex((x) => x.path === f.path);
    if (i > -1) out[i] = f;
    else out.push(f);
  }
  return out;
}

export function safeProjectPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p || p.length > 120) return null;
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return null;
  if (p.split("/").some((seg) => seg === ".." || seg === "" || seg === ".")) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(p)) return null;
  if (p.split("/").length > 5) return null;
  return p;
}

export function projectSlug(title: string): string {
  return (
    title
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "site"
  );
}
