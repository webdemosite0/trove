"use client";

export interface LocalProjectFile {
  path: string;
  content: string;
}

interface LocalFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

type LocalPermissionMode = "read" | "readwrite";
type LocalPermissionState = "granted" | "denied" | "prompt";

interface LocalDirectoryHandle {
  kind: "directory";
  name: string;
  queryPermission?(options?: { mode?: LocalPermissionMode }): Promise<LocalPermissionState>;
  requestPermission?(options?: { mode?: LocalPermissionMode }): Promise<LocalPermissionState>;
  values(): AsyncIterableIterator<LocalFileHandle | LocalDirectoryHandle>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<LocalDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<LocalFileHandle>;
}

export interface LocalProjectWorkspace {
  name: string;
  scope: string;
  files: LocalProjectFile[];
  handle: LocalDirectoryHandle | null;
  native?: boolean;
}

export interface LocalDevServerResult {
  url: string;
  port: number;
  reused?: boolean;
  installed?: boolean;
  command?: string;
  stdout?: string;
  stderr?: string;
  running?: boolean;
}

interface TroveDesktopBridge {
  kind: "electron";
  platform: string;
  version(): Promise<string>;
  openProject(): Promise<
    | { name: string; scope: string; files: LocalProjectFile[]; native?: boolean }
    | null
  >;
  createProject(
    name: string,
  ): Promise<
    | { name: string; scope: string; files: LocalProjectFile[]; native?: boolean }
    | null
  >;
  writeFiles(
    scope: string,
    files: LocalProjectFile[],
  ): Promise<{ written?: string[] }>;
  runTask(
    scope: string,
    task: "install" | "build" | "test" | "lint" | "typecheck",
  ): Promise<{
    cancelled?: boolean;
    code?: number;
    stdout?: string;
    stderr?: string;
  }>;
  startDev(scope: string): Promise<LocalDevServerResult>;
  stopDev(scope: string): Promise<{ stopped: boolean }>;
  devStatus(scope: string): Promise<LocalDevServerResult | null>;
}

function desktopBridge(): TroveDesktopBridge | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { troveDesktop?: TroveDesktopBridge }).troveDesktop ??
    null
  );
}

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".vercel",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  "target",
]);

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "css", "scss", "sass", "less",
  "html", "htm", "md", "mdx", "txt",
  "json", "jsonc", "yaml", "yml", "toml",
  "py", "rb", "php", "go", "rs", "java", "kt", "kts",
  "c", "h", "cc", "cpp", "hpp", "cs", "swift",
  "sh", "bash", "zsh", "fish", "sql", "graphql", "gql",
  "vue", "svelte", "astro", "xml", "svg",
]);

const ROOT_TEXT_FILES = new Set([
  "dockerfile",
  "makefile",
  "procfile",
  "license",
  "readme",
  "package.json",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
]);

function isSafeProjectFile(path: string) {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop() || "";
  if (
    base === ".env" ||
    (base.startsWith(".env.") && base !== ".env.example") ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(base) ||
    /(?:secret|credentials?)\.json$/i.test(base)
  ) {
    return false;
  }

  if (ROOT_TEXT_FILES.has(base)) return true;
  const ext = base.includes(".") ? base.split(".").pop() || "" : "";
  return TEXT_EXTENSIONS.has(ext);
}

async function requestReadWritePermission(
  handle: LocalDirectoryHandle,
): Promise<void> {
  const options = { mode: "readwrite" as const };

  if (handle.queryPermission) {
    const current = await handle.queryPermission(options);
    if (current === "granted") return;
  }

  if (handle.requestPermission) {
    const next = await handle.requestPermission(options);
    if (next === "granted") return;
    throw new Error(
      "Trove needs read and write access to this folder. Choose the folder again and allow file changes.",
    );
  }

  // Older Chromium builds grant picker permissions implicitly. If the
  // permission APIs are unavailable, continue and let the first write be the
  // compatibility check.
}

async function assertReadWritePermission(
  handle: LocalDirectoryHandle,
): Promise<void> {
  if (!handle.queryPermission) return;
  const current = await handle.queryPermission({ mode: "readwrite" });
  if (current !== "granted") {
    throw new Error(
      "Folder write access expired. Open the local project again and grant read/write access before asking Trove to edit it.",
    );
  }
}

export function localFolderSupported() {
  return Boolean(
    desktopBridge() ||
      (typeof window !== "undefined" &&
        typeof (window as unknown as { showDirectoryPicker?: unknown })
          .showDirectoryPicker === "function"),
  );
}

export function nativeProjectSupported() {
  return Boolean(desktopBridge());
}

function projectSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "trove-project";
}

async function writeTextFile(
  directory: LocalDirectoryHandle,
  path: string,
  content: string,
) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return;

  let dir = directory;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  const file = await dir.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createLocalProject(
  name: string,
): Promise<LocalProjectWorkspace> {
  const native = desktopBridge();
  if (native) {
    const workspace = await native.createProject(name);
    if (!workspace) throw new DOMException("Cancelled", "AbortError");
    return {
      name: workspace.name,
      scope: workspace.scope,
      files: workspace.files,
      handle: null,
      native: true,
    };
  }

  const picker = (window as unknown as {
    showDirectoryPicker?: (options?: { mode?: LocalPermissionMode }) => Promise<LocalDirectoryHandle>;
  }).showDirectoryPicker;

  if (!picker) {
    throw new Error("Creating local projects requires Trove Desktop, Chrome, or Edge.");
  }

  const parent = await picker({ mode: "readwrite" });
  await requestReadWritePermission(parent);
  const slug = projectSlug(name);
  const handle = await parent.getDirectoryHandle(slug, { create: true });
  const safeTitle = name.replace(/[<>]/g, "");
  const safeHeading = name.replace(/[`$\\]/g, "");

  const starter: LocalProjectFile[] = [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: slug,
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
          dependencies: {
            "@vitejs/plugin-react": "^4.3.4",
            vite: "^6.0.11",
            typescript: "^5.7.2",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {},
        },
        null,
        2,
      ) + "\\n",
    },
    {
      path: "index.html",
      content:
        "<!doctype html>\\n<html lang=\"en\">\\n  <head>\\n    <meta charset=\"UTF-8\" />\\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\\n    <title>" +
        safeTitle +
        "</title>\\n  </head>\\n  <body>\\n    <div id=\"root\"></div>\\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\\n  </body>\\n</html>\\n",
    },
    {
      path: "src/main.tsx",
      content:
        "import React from \"react\";\\nimport { createRoot } from \"react-dom/client\";\\nimport App from \"./App\";\\nimport \"./styles.css\";\\n\\ncreateRoot(document.getElementById(\"root\")!).render(\\n  <React.StrictMode>\\n    <App />\\n  </React.StrictMode>,\\n);\\n",
    },
    {
      path: "src/App.tsx",
      content:
        "export default function App() {\\n  return (\\n    <main className=\"app\">\\n      <section className=\"card\">\\n        <span className=\"eyebrow\">Trove Browser Project</span>\\n        <h1>" +
        safeHeading +
        "</h1>\\n        <p>Describe what you want in Trove chat. The AI can edit these local files and verify the project in its isolated browser workspace.</p>\\n      </section>\\n    </main>\\n  );\\n}\\n",
    },
    {
      path: "src/styles.css",
      content:
        ":root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #17171a; background: #f5f3ff; }\\n* { box-sizing: border-box; }\\nbody { margin: 0; }\\n.app { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: radial-gradient(circle at top left,#eadcff,transparent 42%),radial-gradient(circle at bottom right,#d9efff,transparent 38%),#f8f7ff; }\\n.card { width: min(680px,100%); padding: 48px; border: 1px solid #ddd6fe; border-radius: 28px; background: rgba(255,255,255,.82); box-shadow: 0 28px 80px rgba(76,29,149,.12); backdrop-filter: blur(18px); }\\n.eyebrow { color: #7c3aed; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }\\nh1 { margin: 14px 0 12px; font-size: clamp(40px,8vw,72px); letter-spacing: -.05em; }\\np { margin: 0; max-width: 54ch; color: #5b5568; font-size: 17px; line-height: 1.65; }\\n",
    },
  ];

  for (const file of starter) {
    await writeTextFile(handle, file.path, file.content);
  }

  return {
    name,
    scope: crypto.randomUUID(),
    files: starter,
    handle,
  };
}

export async function pickLocalProject(): Promise<LocalProjectWorkspace> {
  const native = desktopBridge();
  if (native) {
    const workspace = await native.openProject();
    if (!workspace) throw new DOMException("Cancelled", "AbortError");
    return {
      name: workspace.name,
      scope: workspace.scope,
      files: workspace.files,
      handle: null,
      native: true,
    };
  }

  const picker = (window as unknown as {
    showDirectoryPicker?: (options?: { mode?: LocalPermissionMode }) => Promise<LocalDirectoryHandle>;
  }).showDirectoryPicker;

  if (!picker) {
    throw new Error("Local folders require Trove Desktop, Chrome, or Edge.");
  }

  const handle = await picker({ mode: "readwrite" });
  // This must happen immediately after the picker resolves. Browsers only
  // permit requestPermission() during the user's click/selection gesture.
  await requestReadWritePermission(handle);
  const files: LocalProjectFile[] = [];
  let totalBytes = 0;
  const MAX_FILES = 80;
  const MAX_TOTAL = 2_000_000;
  const MAX_FILE = 220_000;

  async function walk(dir: LocalDirectoryHandle, prefix = "") {
    for await (const entry of dir.values()) {
      if (files.length >= MAX_FILES || totalBytes >= MAX_TOTAL) return;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        await walk(entry, path);
        continue;
      }

      if (!isSafeProjectFile(path)) continue;
      const file = await entry.getFile();
      if (file.size > MAX_FILE) continue;
      const content = await file.text().catch(() => "");
      if (!content) continue;
      totalBytes += content.length;
      if (totalBytes > MAX_TOTAL) return;
      files.push({ path, content });
    }
  }

  await walk(handle);
  return {
    name: handle.name || "Local project",
    scope: crypto.randomUUID(),
    files,
    handle,
  };
}

function safePath(path: string) {
  const clean = String(path || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !clean ||
    clean.includes("..") ||
    clean.startsWith(".git/") ||
    clean.startsWith("node_modules/") ||
    clean.startsWith(".next/")
  ) {
    return "";
  }
  return clean;
}

export async function writeLocalProjectFiles(
  handle: LocalDirectoryHandle | null,
  files: LocalProjectFile[],
  scope?: string,
) {
  const native = desktopBridge();
  if (native && scope) {
    await native.writeFiles(scope, files);
    return;
  }
  if (!handle) {
    throw new Error("This local project is no longer available. Open it again.");
  }

  // Do not call requestPermission() here: this function runs after an async AI
  // response, outside a user activation, and Chromium will reject that request.
  await assertReadWritePermission(handle);

  for (const file of files) {
    const path = safePath(file.path);
    if (!path || !isSafeProjectFile(path)) continue;

    const parts = path.split("/").filter(Boolean);
    const name = parts.pop();
    if (!name) continue;

    let dir = handle;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }

    const target = await dir.getFileHandle(name, { create: true });
    const writable = await target.createWritable();
    await writable.write(file.content);
    await writable.close();
  }
}


export async function runLocalProjectTask(
  scope: string,
  task: "install" | "build" | "test" | "lint" | "typecheck",
) {
  const native = desktopBridge();
  if (!native) {
    throw new Error("Local task execution requires the Trove Desktop app.");
  }
  return native.runTask(scope, task);
}

export async function startLocalDevServer(scope: string) {
  const native = desktopBridge();
  if (!native) {
    throw new Error(
      "A real localhost dev server requires Trove Desktop. In a normal browser Trove runs the project in the isolated Browser Workspace instead.",
    );
  }
  return native.startDev(scope);
}

export async function stopLocalDevServer(scope: string) {
  const native = desktopBridge();
  if (!native) return { stopped: false };
  return native.stopDev(scope);
}

export async function localDevServerStatus(scope: string) {
  const native = desktopBridge();
  if (!native) return null;
  return native.devStatus(scope);
}


