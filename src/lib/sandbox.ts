import "server-only";
import { Sandbox } from "e2b";

export const PROJECT_ROOT = "/home/user/project";
export const PREVIEW_PORT = 3000;

export function sandboxConfigured() {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

export function requireE2BKey() {
  const key = process.env.E2B_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "E2B_API_KEY is not set. Add it in your host env (Vercel → Settings → Environment Variables). Get a key at https://e2b.dev/dashboard",
    );
  }
  return key;
}

/** Create a sandbox and upload project files under /home/user/project. */
export async function createProjectSandbox(
  files: { path: string; content: string }[],
  opts?: { timeoutMs?: number },
) {
  requireE2BKey();
  const sandbox = await Sandbox.create({
    timeoutMs: opts?.timeoutMs ?? 15 * 60_000,
  });

  await sandbox.files.makeDir(PROJECT_ROOT).catch(() => undefined);

  const batch = files
    .filter((f) => f.path && !f.path.includes(".."))
    .slice(0, 80)
    .map((f) => ({
      path: `${PROJECT_ROOT}/${f.path.replace(/^\/+/, "")}`,
      data: f.content,
    }));

  if (batch.length) {
    await sandbox.files.write(batch);
  }

  // Vite blocks unknown hosts (e.g. 3000-*.e2b.app) unless allowedHosts is set
  await ensureViteAllowsE2B(sandbox, files);

  return sandbox;
}

/**
 * Inject / patch vite.config so Preview through E2B proxy hosts works.
 * Error without this:
 *   Blocked request. This host ("3000-….e2b.app") is not allowed.
 */
async function ensureViteAllowsE2B(
  sandbox: Sandbox,
  files: { path: string; content: string }[],
) {
  const pkg = files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
  if (!pkg) return;

  let isVite = false;
  try {
    const j = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const all = { ...j.dependencies, ...j.devDependencies };
    isVite =
      Boolean(all?.vite) ||
      Boolean(all?.["@vitejs/plugin-react"]) ||
      /\bvite\b/.test(j.scripts?.dev ?? "") ||
      /\bvite\b/.test(j.scripts?.start ?? "");
  } catch {
    return;
  }
  if (!isVite) return;

  const snippet = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Auto-injected by Trove so E2B preview hosts (*.e2b.app) are allowed
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: ${PREVIEW_PORT},
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: ${PREVIEW_PORT},
    allowedHosts: true,
  },
})
`.trim();

  // Prefer overwriting a minimal config so allowedHosts always wins
  await sandbox.files.write([
    { path: `${PROJECT_ROOT}/vite.config.js`, data: snippet + "\n" },
    {
      path: `${PROJECT_ROOT}/vite.config.ts`,
      data:
        snippet
          .replace("import { defineConfig } from 'vite'", "import { defineConfig } from 'vite'")
          .replace(
            "import react from '@vitejs/plugin-react'",
            "import react from '@vitejs/plugin-react'\n// @ts-nocheck",
          ) + "\n",
    },
  ]);
}

export async function connectSandbox(sandboxId: string) {
  requireE2BKey();
  return Sandbox.connect(sandboxId);
}

export function publicUrl(sandbox: Sandbox, port = PREVIEW_PORT) {
  const host = sandbox.getHost(port);
  return host.startsWith("http") ? host : `https://${host}`;
}

/** Start a static file server on PREVIEW_PORT (works for HTML/CSS/JS sites). */
export async function startStaticServer(sandbox: Sandbox) {
  await sandbox.commands.run(
    `python3 -m http.server ${PREVIEW_PORT} --bind 0.0.0.0`,
    { background: true, cwd: PROJECT_ROOT },
  );
  await sandbox.commands.run("sleep 1").catch(() => undefined);
  return publicUrl(sandbox, PREVIEW_PORT);
}

/**
 * Pick the right server: Vite/React → npm install + vite; otherwise static HTTP.
 */
export async function startPreviewServer(
  sandbox: Sandbox,
  files: { path: string; content: string }[],
) {
  const pkgFile = files.find(
    (f) => f.path === "package.json" || f.path.endsWith("/package.json"),
  );

  let kind: "static" | "vite" | "next" = "static";
  if (pkgFile) {
    try {
      const j = JSON.parse(pkgFile.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      const all = { ...j.dependencies, ...j.devDependencies };
      if (all?.next) kind = "next";
      else if (
        all?.vite ||
        all?.["@vitejs/plugin-react"] ||
        /\bvite\b/.test(j.scripts?.dev ?? "")
      ) {
        kind = "vite";
      }
    } catch {
      /* static */
    }
  }

  if (kind === "static") {
    return startStaticServer(sandbox);
  }

  // Install deps (may take a minute)
  await sandbox.commands.run("npm install --prefer-offline --no-audit --no-fund", {
    cwd: PROJECT_ROOT,
    timeoutMs: 180_000,
  });

  if (kind === "vite") {
    // Force host + port; config already has allowedHosts: true
    await sandbox.commands.run(
      `npx vite --host 0.0.0.0 --port ${PREVIEW_PORT} --strictPort`,
      { background: true, cwd: PROJECT_ROOT },
    );
  } else {
    await sandbox.commands.run(
      `npx next dev -H 0.0.0.0 -p ${PREVIEW_PORT}`,
      { background: true, cwd: PROJECT_ROOT },
    );
  }

  await sandbox.commands.run("sleep 3").catch(() => undefined);
  return publicUrl(sandbox, PREVIEW_PORT);
}

const BLOCKED =
  /\b(rm\s+-rf\s+\/|mkfs|dd\s+if=|shutdown|reboot|:(){:|:&};:)\b/i;

export function assertSafeCommand(cmd: string) {
  const t = cmd.trim();
  if (!t) throw new Error("Empty command");
  if (t.length > 2000) throw new Error("Command too long");
  if (BLOCKED.test(t)) throw new Error("Command blocked for safety");
  return t;
}
