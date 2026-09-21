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

interface LocalDirectoryHandle {
  kind: "directory";
  name: string;
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
  files: LocalProjectFile[];
  handle: LocalDirectoryHandle;
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
    base.startsWith(".env.") && base !== ".env.example" ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(base) ||
    /(?:secret|credentials?)\.json$/i.test(base)
  ) {
    return false;
  }

  if (ROOT_TEXT_FILES.has(base)) return true;
  const ext = base.includes(".") ? base.split(".").pop() || "" : "";
  return TEXT_EXTENSIONS.has(ext);
}

export function localFolderSupported() {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function"
  );
}

export async function pickLocalProject(): Promise<LocalProjectWorkspace> {
  const picker = (window as unknown as {
    showDirectoryPicker?: () => Promise<LocalDirectoryHandle>;
  }).showDirectoryPicker;

  if (!picker) {
    throw new Error("Local folders require Chrome or Edge on desktop.");
  }

  const handle = await picker();
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
  return { name: handle.name || "Local project", files, handle };
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
  handle: LocalDirectoryHandle,
  files: LocalProjectFile[],
) {
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
