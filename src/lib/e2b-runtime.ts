import "server-only";

import { createHash } from "node:crypto";
import { Sandbox } from "e2b";
import type { ProjectFile } from "@/lib/builder";

const PROJECT_ROOT = "/home/user/project";
const PREVIEW_PORT = 5173;
const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_FILES = 250;
const MAX_FILE_BYTES = 750_000;
const MAX_PROJECT_BYTES = 10_000_000;
const TERMINAL_TIMEOUT_MS = 45_000;
const MAX_TERMINAL_COMMAND_CHARS = 4_000;
const BLOCKED_TERMINAL_COMMAND =
  /\b(mkfs|shutdown|reboot|poweroff|halt|masscan|nmap|xmrig|cpuminer|minerd)\b|:\(\)\s*\{.*:\|.*&.*\}|rm\s+-[a-z]*r[a-z]*f[a-z]*\s+\/(?:\s|$)|--no-preserve-root|dd\s+.*if=\/dev\/(zero|random|urandom)|while\s+(true|:)\s*;/i;
const PREVIEW_RUNTIME_VERSION = "vite-e2b-host-v2";
const PREVIEW_RUNTIME_MARKER = `${PROJECT_ROOT}/.trove-preview-runtime`;
const TROVE_VITE_CONFIG = `${PROJECT_ROOT}/.trove-vite.config.mjs`;

function requireApiKey() {
  const apiKey = process.env.E2B_API_KEY?.trim();
  if (!apiKey) throw new Error("E2B_API_KEY is not configured.");
  return apiKey;
}

function safePath(raw: string) {
  return String(raw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function safeMetadataValue(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_.:-]/g, "-")
    .slice(0, 100);
}

function defaultPackageJson() {
  return JSON.stringify(
    {
      name: "trove-preview",
      private: true,
      type: "module",
      scripts: { dev: "vite" },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        vite: "^6.0.11",
        "@vitejs/plugin-react": "^4.3.4",
      },
    },
    null,
    2,
  );
}

export function normalizeProjectFiles(files: ProjectFile[]) {
  const input = Array.isArray(files) ? files : [];
  if (input.length > MAX_FILES) {
    throw new Error("PROJECT_LIMIT_FILES");
  }

  let totalBytes = 0;
  const cleaned = input
    .map((file) => {
      const path = safePath(file.path);
      const content = String(file.content ?? "");
      const bytes = Buffer.byteLength(content, "utf8");
      if (bytes > MAX_FILE_BYTES) throw new Error("PROJECT_LIMIT_FILE_SIZE");
      totalBytes += bytes;
      if (totalBytes > MAX_PROJECT_BYTES) throw new Error("PROJECT_LIMIT_TOTAL_SIZE");
      return { path, content };
    })
    .filter((file) => file.path);

  if (!cleaned.some((file) => file.path === "package.json")) {
    const content = defaultPackageJson();
    totalBytes += Buffer.byteLength(content, "utf8");
    if (totalBytes > MAX_PROJECT_BYTES) throw new Error("PROJECT_LIMIT_TOTAL_SIZE");
    cleaned.push({ path: "package.json", content });
  }

  return cleaned;
}

function hashPackage(files: { path: string; content: string }[]) {
  const dependencyFiles = files
    .filter((file) =>
      [
        "package.json",
        "package-lock.json",
        "npm-shrinkwrap.json",
        "pnpm-lock.yaml",
        "yarn.lock",
      ].includes(file.path),
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  const source = dependencyFiles.length
    ? dependencyFiles.map((file) => `${file.path}\n${file.content}`).join("\n---\n")
    : defaultPackageJson();

  return createHash("sha256").update(source).digest("hex");
}

function viteWrapperConfig(previewHost: string) {
  const safeHost = JSON.stringify(previewHost);
  return `import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfigFromFile, mergeConfig } from "vite";

const candidates = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.mts",
  "vite.config.cts",
];

export default async function trovePreviewConfig(env) {
  let base = {};

  for (const name of candidates) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    const loaded = await loadConfigFromFile(env, file, process.cwd());
    if (loaded?.config) base = loaded.config;
    break;
  }

  return mergeConfig(base, {
    server: {
      host: "0.0.0.0",
      port: ${PREVIEW_PORT},
      strictPort: true,
      allowedHosts: [".e2b.app", ${safeHost}],
    },
  });
}
`;
}

async function portIsUp(sandbox: Sandbox) {
  const result = await sandbox.commands.run(
    `bash -lc 'if (command -v ss >/dev/null 2>&1 && ss -ltn | grep -q ":${PREVIEW_PORT} ") || (echo >/dev/tcp/127.0.0.1/${PREVIEW_PORT}) >/dev/null 2>&1; then echo up; else echo down; fi'`,
    { timeoutMs: 10_000 },
  );
  return result.stdout.trim() === "up";
}

async function stopPreviewServer(sandbox: Sandbox) {
  await sandbox.commands.run(
    `bash -lc "pkill -f '[v]ite.*${PREVIEW_PORT}' >/dev/null 2>&1 || true; pkill -f '[n]pm run dev' >/dev/null 2>&1 || true"`,
    { timeoutMs: 10_000 },
  );
}

async function startPreviewServer(sandbox: Sandbox) {
  const previewHost = sandbox.getHost(PREVIEW_PORT);

  // Force the host allowlist at the Vite config layer so this works even for
  // generated projects whose installed Vite version does not honor the
  // additional-host environment variable consistently. The wrapper loads and
  // merges the project's own Vite config, preserving React/plugins/settings.
  await sandbox.files.write(TROVE_VITE_CONFIG, viteWrapperConfig(previewHost));

  const process = await sandbox.commands.run(
    `bash -lc 'export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=".e2b.app,${previewHost}"; npm run dev -- --config .trove-vite.config.mjs --host 0.0.0.0 --port ${PREVIEW_PORT} --strictPort > /tmp/trove-vite.log 2>&1'`,
    {
      cwd: PROJECT_ROOT,
      background: true,
      timeoutMs: 0,
    },
  );

  // Detach the SDK stream; E2B keeps the background process alive inside the
  // sandbox and Trove can reconnect on the next request.
  if (typeof process.disconnect === "function") {
    await process.disconnect();
  }

  try {
    await sandbox.commands.run(
      `bash -lc 'for i in $(seq 1 80); do if (command -v ss >/dev/null 2>&1 && ss -ltn | grep -q ":${PREVIEW_PORT} ") || (echo >/dev/tcp/127.0.0.1/${PREVIEW_PORT}) >/dev/null 2>&1; then exit 0; fi; sleep 0.25; done; exit 1'`,
      { timeoutMs: 25_000 },
    );
    await sandbox.files.write(PREVIEW_RUNTIME_MARKER, PREVIEW_RUNTIME_VERSION);
  } catch (error) {
    const logs = await sandbox.commands
      .run("bash -lc 'tail -80 /tmp/trove-vite.log 2>/dev/null || true'", { timeoutMs: 10_000 })
      .catch(() => null);
    const suffix = logs?.stdout?.trim() ? `\n${logs.stdout.trim()}` : "";
    throw new Error(`Preview server failed to start.${suffix}`, { cause: error });
  }
}

export async function connectExistingSandbox(sandboxId: string) {
  const apiKey = requireApiKey();
  const sandbox = await Sandbox.connect(sandboxId, { apiKey });
  await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
  return sandbox;
}

export async function connectOrCreateSandbox(
  existingSandboxId?: string | null,
  projectScope?: string | null,
) {
  if (existingSandboxId) {
    try {
      const sandbox = await connectExistingSandbox(existingSandboxId);
      return { sandbox, reused: true };
    } catch {
      // The sandbox may have timed out or been killed. Create a fresh one.
    }
  }

  const apiKey = requireApiKey();
  const sandbox = await Sandbox.create({
    apiKey,
    timeoutMs: SANDBOX_TIMEOUT_MS,
    metadata: {
      app: "trove",
      purpose: "site-preview",
      ...(projectScope ? { project: safeMetadataValue(projectScope) } : {}),
    },
  });

  return { sandbox, reused: false };
}

export async function syncE2BProject(sandbox: Sandbox, projectFiles: ProjectFile[]) {
  const files = normalizeProjectFiles(projectFiles);
  const packageHash = hashPackage(files);
  const packageHashPath = `${PROJECT_ROOT}/.trove-package-hash`;

  await sandbox.commands.run(`mkdir -p ${PROJECT_ROOT}`, { timeoutMs: 10_000 });

  let previousHash = "";
  try {
    previousHash = String(await sandbox.files.read(packageHashPath)).trim();
  } catch {
    previousHash = "";
  }

  let runtimeVersion = "";
  try {
    runtimeVersion = String(await sandbox.files.read(PREVIEW_RUNTIME_MARKER)).trim();
  } catch {
    runtimeVersion = "";
  }

  const packageChanged = previousHash !== packageHash;
  const runtimeChanged = runtimeVersion !== PREVIEW_RUNTIME_VERSION;
  const wasRunning = await portIsUp(sandbox).catch(() => false);

  if ((packageChanged || runtimeChanged) && wasRunning) {
    await stopPreviewServer(sandbox);
  }

  await sandbox.commands.run(
    `bash -lc 'cd ${PROJECT_ROOT} && find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .trove-package-hash ! -name .trove-preview-runtime ! -name .trove-vite.config.mjs -exec rm -rf {} +'`,
    { timeoutMs: 15_000 },
  );

  await sandbox.files.write(
    files.map((file) => ({
      path: `${PROJECT_ROOT}/${file.path}`,
      data: file.content,
    })),
  );

  if (packageChanged) {
    await sandbox.commands.run("npm install --no-audit --no-fund", {
      cwd: PROJECT_ROOT,
      timeoutMs: 240_000,
    });
    await sandbox.files.write(packageHashPath, packageHash);
  }

  const runningAfterSync = await portIsUp(sandbox).catch(() => false);
  if (!runningAfterSync) {
    await startPreviewServer(sandbox);
  }

  return {
    url: `https://${sandbox.getHost(PREVIEW_PORT)}`,
    port: PREVIEW_PORT,
    packageChanged,
  };
}

export function assertSafeE2BCommand(command: string) {
  const value = String(command || "").trim();
  if (!value) throw new Error("SANDBOX_COMMAND_EMPTY");
  if (value.length > MAX_TERMINAL_COMMAND_CHARS) {
    throw new Error("SANDBOX_COMMAND_TOO_LONG");
  }
  if (BLOCKED_TERMINAL_COMMAND.test(value)) {
    throw new Error("SANDBOX_COMMAND_BLOCKED");
  }
  return value;
}

export async function runE2BCommand(sandbox: Sandbox, command: string) {
  const value = assertSafeE2BCommand(command);

  try {
    return await sandbox.commands.run(value, {
      cwd: PROJECT_ROOT,
      timeoutMs: TERMINAL_TIMEOUT_MS,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "stdout" in error &&
      "stderr" in error &&
      "exitCode" in error
    ) {
      return {
        stdout: String((error as { stdout?: unknown }).stdout ?? ""),
        stderr: String((error as { stderr?: unknown }).stderr ?? ""),
        exitCode: Number((error as { exitCode?: unknown }).exitCode ?? 1),
      };
    }
    throw error;
  }
}

export function e2bCookieName(userId: string, scope: string) {
  const digest = createHash("sha256")
    .update(`${userId}:${scope}`)
    .digest("hex")
    .slice(0, 20);
  return `trove_e2b_${digest}`;
}

export const e2bRuntimeConfig = {
  projectRoot: PROJECT_ROOT,
  previewPort: PREVIEW_PORT,
  timeoutMs: SANDBOX_TIMEOUT_MS,
  terminalTimeoutMs: TERMINAL_TIMEOUT_MS,
  terminalMaxCommandChars: MAX_TERMINAL_COMMAND_CHARS,
};
