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
 * srcdoc string. The iframe has no origin of its own, so a relative
 * <link href="styles.css"> would resolve against the app and 404.
 *
 * Also builds a lightweight React CDN preview when the project is JSX and
 * has no static index.html — enough to show the UI in the pane without a
 * real Vite server.
 */
export function bundle(files: ProjectFile[], entry = "index.html"): string {
  const index =
    files.find((f) => f.path === entry) ??
    files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html")) ??
    files.find((f) => f.path.endsWith(".html"));

  if (index) {
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

  // No HTML entry — try a React/JSX live preview via CDN
  return reactCdnPreview(files);
}

/** Best-effort in-browser preview for Vite/React file sets (no npm). */
function reactCdnPreview(files: ProjectFile[]): string {
  const app =
    files.find((f) => /(?:^|\/)App\.(jsx|tsx|js)$/i.test(f.path)) ??
    files.find((f) => /src\/main\.(jsx|tsx|js)$/i.test(f.path));
  if (!app) return "";

  const css = files
    .filter((f) => f.path.endsWith(".css"))
    .map((f) => f.content)
    .join("\n");

  // Strip import/export so Babel standalone can run a single component file
  let body = app.content
    .replace(/^import\s+.+?;?\s*$/gm, "")
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/export\s+default\s+/g, "const __App = ")
    .replace(/export\s+\{[^}]+\};?/g, "");

  if (!/const __App\s*=/.test(body) && /function\s+App\b/.test(body)) {
    body += "\nconst __App = App;\n";
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
${body}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(__App));
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

/**
 * Normalises a generated file path.
 *
 * Nested paths are required now that a React project needs src/App.jsx, so
 * slashes have to survive — the previous rule stripped every character outside
 * [A-Za-z0-9._-] and quietly turned src/App.jsx into srcApp.jsx.
 *
 * Traversal is still refused rather than sanitised: a path containing ".." or
 * an absolute root is rejected outright, because a "cleaned" traversal is the
 * kind of thing that looks handled and is not. These paths are written into a
 * zip the user extracts, so an escaping entry would land outside the folder.
 */
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

/** A stable, filename-safe stem for downloads. */
export function projectSlug(title: string): string {
  return (
    title
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "site"
  );
}
