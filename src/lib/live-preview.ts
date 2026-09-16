import "server-only";
import { Sandbox } from "@e2b/code-interpreter";

export const PREVIEW_ROOT = "/home/user/project";

export type PreviewFramework = "vite" | "next" | "node" | "python" | "laravel" | "static";

export type PreviewFile = { path: string; content: string };

export type PreviewRuntime = {
  sandbox: Sandbox;
  sandboxId: string;
  framework: PreviewFramework;
  port: number;
  url: string;
  reused: boolean;
};

function apiKey() {
  const key = process.env.E2B_API_KEY?.trim();
  if (!key) throw new Error("E2B_API_KEY is not set.");
  return key;
}

function packageJson(files: PreviewFile[]) {
  const file = files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
  if (!file) return null;
  try {
    return JSON.parse(file.content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

export function detectPreviewFramework(files: PreviewFile[], target?: string): PreviewFramework {
  const paths = new Set(files.map((f) => f.path.replace(/^\/+/, "")));
  if (target === "laravel" || paths.has("artisan")) return "laravel";
  if (target === "python" || paths.has("requirements.txt") || paths.has("pyproject.toml") || paths.has("manage.py")) return "python";

  const pkg = packageJson(files);
  if (pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const scripts = pkg.scripts || {};
    if (deps.next) return "next";
    if (deps.vite || deps["@vitejs/plugin-react"] || /\bvite\b/.test(scripts.dev || "")) return "vite";
    return "node";
  }

  if (target === "node") return "node";
  return "static";
}

export function previewPort(framework: PreviewFramework) {
  if (framework === "vite") return 5173;
  if (framework === "python") return 8000;
  if (framework === "laravel") return 8000;
  if (framework === "static") return 8080;
  return 3000;
}

async function writeProjectFiles(sandbox: Sandbox, files: PreviewFile[]) {
  await sandbox.files.makeDir(PREVIEW_ROOT).catch(() => undefined);
  const safe = files
    .filter((f) => f.path && !f.path.includes(".."))
    .slice(0, 250)
    .map((f) => ({
      path: `${PREVIEW_ROOT}/${f.path.replace(/^\/+/, "")}`,
      data: String(f.content ?? ""),
    }));
  if (safe.length) await sandbox.files.write(safe);
}

async function ensureViteConfig(sandbox: Sandbox) {
  const config = `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: "0.0.0.0",\n    port: 5173,\n    strictPort: true,\n    allowedHosts: true,\n    hmr: { protocol: "wss", clientPort: 443 },\n  },\n  preview: { host: "0.0.0.0", port: 5173, allowedHosts: true },\n});\n`;
  await sandbox.files.write(`${PREVIEW_ROOT}/vite.config.js`, config);
}

async function commandExists(sandbox: Sandbox, name: string) {
  const result = await sandbox.commands.run(`command -v ${name}`, {
    cwd: PREVIEW_ROOT,
    timeoutMs: 5_000,
  }).catch(() => null);
  return Boolean(result && result.exitCode === 0);
}

async function installAndStart(sandbox: Sandbox, framework: PreviewFramework, files: PreviewFile[]) {
  const pkg = packageJson(files);

  if (framework === "vite") {
    await ensureViteConfig(sandbox);
    await sandbox.commands.run("npm install --prefer-offline --no-audit --no-fund", {
      cwd: PREVIEW_ROOT,
      timeoutMs: 240_000,
    });
    await sandbox.commands.run("npx vite --host 0.0.0.0 --port 5173 --strictPort", {
      cwd: PREVIEW_ROOT,
      background: true,
    });
    return;
  }

  if (framework === "next") {
    await sandbox.commands.run("npm install --prefer-offline --no-audit --no-fund", {
      cwd: PREVIEW_ROOT,
      timeoutMs: 240_000,
    });
    await sandbox.commands.run("npx next dev -H 0.0.0.0 -p 3000", {
      cwd: PREVIEW_ROOT,
      background: true,
    });
    return;
  }

  if (framework === "node") {
    await sandbox.commands.run("npm install --prefer-offline --no-audit --no-fund", {
      cwd: PREVIEW_ROOT,
      timeoutMs: 240_000,
    });
    const script = pkg?.scripts?.dev ? "npm run dev" : pkg?.scripts?.start ? "npm start" : "node server.js";
    await sandbox.commands.run(script, { cwd: PREVIEW_ROOT, background: true });
    return;
  }

  if (framework === "python") {
    const hasRequirements = files.some((f) => f.path === "requirements.txt");
    if (hasRequirements) {
      await sandbox.commands.run("python3 -m pip install -r requirements.txt", {
        cwd: PREVIEW_ROOT,
        timeoutMs: 240_000,
      });
    }
    const hasManage = files.some((f) => f.path === "manage.py");
    if (hasManage) {
      await sandbox.commands.run("python3 manage.py runserver 0.0.0.0:8000", {
        cwd: PREVIEW_ROOT,
        background: true,
      });
    } else {
      await sandbox.commands.run("python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload", {
        cwd: PREVIEW_ROOT,
        background: true,
      });
    }
    return;
  }

  if (framework === "laravel") {
    if (!(await commandExists(sandbox, "php")) || !(await commandExists(sandbox, "composer"))) {
      throw new Error("This E2B sandbox image does not include PHP + Composer. Use a custom E2B template with PHP/Composer for Laravel previews.");
    }
    await sandbox.commands.run("composer install --no-interaction --prefer-dist", {
      cwd: PREVIEW_ROOT,
      timeoutMs: 300_000,
    });
    await sandbox.commands.run("php artisan serve --host=0.0.0.0 --port=8000", {
      cwd: PREVIEW_ROOT,
      background: true,
    });
    return;
  }

  await sandbox.commands.run("python3 -m http.server 8080 --bind 0.0.0.0", {
    cwd: PREVIEW_ROOT,
    background: true,
  });
}

async function isListening(sandbox: Sandbox, port: number) {
  const result = await sandbox.commands.run(
    `python3 - <<'PY'\nimport socket\ns=socket.socket(); s.settimeout(1)\ntry:\n s.connect(('127.0.0.1', ${port})); print('ok')\nexcept Exception:\n raise SystemExit(1)\nfinally:\n s.close()\nPY`,
    { cwd: PREVIEW_ROOT, timeoutMs: 5_000 },
  ).catch(() => null);
  return Boolean(result && result.exitCode === 0);
}

async function waitForPort(sandbox: Sandbox, port: number) {
  for (let i = 0; i < 24; i++) {
    if (await isListening(sandbox, port)) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export async function openPreviewRuntime(args: {
  files: PreviewFile[];
  target?: string;
  sandboxId?: string | null;
}): Promise<PreviewRuntime> {
  const key = apiKey();
  const framework = detectPreviewFramework(args.files, args.target);
  const port = previewPort(framework);

  let sandbox: Sandbox | null = null;
  let reused = false;
  if (args.sandboxId) {
    try {
      sandbox = await Sandbox.connect(args.sandboxId, { apiKey: key });
      reused = true;
    } catch {
      sandbox = null;
    }
  }

  if (!sandbox) {
    sandbox = await Sandbox.create({ apiKey: key, timeoutMs: 15 * 60_000 });
  }

  await writeProjectFiles(sandbox, args.files);

  const running = reused ? await isListening(sandbox, port) : false;
  if (!running) {
    await installAndStart(sandbox, framework, args.files);
    await waitForPort(sandbox, port);
  }

  const host = sandbox.getHost(port);
  const url = host.startsWith("http") ? host : `https://${host}`;
  return {
    sandbox,
    sandboxId: sandbox.sandboxId,
    framework,
    port,
    url,
    reused,
  };
}
