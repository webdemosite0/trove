import "server-only";

import { createHash } from "node:crypto";
import { Sandbox } from "e2b";
import type { ProjectFile } from "@/lib/builder";

const PROJECT_ROOT = "/home/user/project";
const PREVIEW_PORT = 5173;
const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_FILES = 250;

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
  const cleaned = (Array.isArray(files) ? files : [])
    .slice(0, MAX_FILES)
    .map((file) => ({
      path: safePath(file.path),
      content: String(file.content ?? ""),
    }))
    .filter((file) => file.path);

  if (!cleaned.some((file) => file.path === "package.json")) {
    cleaned.push({ path: "package.json", content: defaultPackageJson() });
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

  // Vite validates the HTTP Host header. E2B exposes each sandbox through a
  // unique *.e2b.app hostname, so allow only this sandbox's exact preview host
  // instead of disabling host validation globally.
  const process = await sandbox.commands.run(
    `bash -lc 'export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="${previewHost}"; npm run dev -- --host 0.0.0.0 --port ${PREVIEW_PORT} --strictPort > /tmp/trove-vite.log 2>&1'`,
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

  const packageChanged = previousHash !== packageHash;
  const wasRunning = await portIsUp(sandbox).catch(() => false);

  if (packageChanged && wasRunning) {
    await stopPreviewServer(sandbox);
  }

  await sandbox.commands.run(
    `bash -lc 'cd ${PROJECT_ROOT} && find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .trove-package-hash -exec rm -rf {} +'`,
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

export async function runE2BCommand(sandbox: Sandbox, command: string) {
  const value = command.trim();
  if (!value) return { stdout: "", stderr: "", exitCode: 0 };

  try {
    return await sandbox.commands.run(value, {
      cwd: PROJECT_ROOT,
      timeoutMs: 120_000,
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
};
