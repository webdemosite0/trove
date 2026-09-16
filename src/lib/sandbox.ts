import "server-only";
import { Sandbox } from "@e2b/code-interpreter";

export const PROJECT_ROOT = "/home/user/project";
export const PREVIEW_PORT = 3000;

export function sandboxConfigured() {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

export function requireE2BKey() {
  const key = process.env.E2B_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "E2B_API_KEY is not set. Add it in your host env (Vercel → Settings → Environment Variables).",
    );
  }
  return key;
}

export async function createProjectSandbox(
  files: { path: string; content: string }[],
  opts?: { timeoutMs?: number },
) {
  const key = requireE2BKey();
  const sandbox = await Sandbox.create({
    apiKey: key,
    timeoutMs: opts?.timeoutMs ?? 15 * 60_000,
  });

  await sandbox.files.makeDir(PROJECT_ROOT).catch(() => undefined);
  const batch = files
    .filter((f) => f.path && !f.path.includes(".."))
    .slice(0, 250)
    .map((f) => ({
      path: `${PROJECT_ROOT}/${f.path.replace(/^\/+/, "")}`,
      data: f.content,
    }));
  if (batch.length) await sandbox.files.write(batch);
  return sandbox;
}

export async function connectSandbox(sandboxId: string) {
  const key = requireE2BKey();
  return Sandbox.connect(sandboxId, { apiKey: key });
}

export function publicUrl(sandbox: Sandbox, port = PREVIEW_PORT) {
  const host = sandbox.getHost(port);
  return host.startsWith("http") ? host : `https://${host}`;
}

export async function startStaticServer(sandbox: Sandbox) {
  await sandbox.commands.run(
    `python3 -m http.server ${PREVIEW_PORT} --bind 0.0.0.0`,
    { background: true, cwd: PROJECT_ROOT },
  );
  return publicUrl(sandbox, PREVIEW_PORT);
}

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
      const pkg = JSON.parse(pkgFile.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.next) kind = "next";
      else if (
        deps.vite ||
        deps["@vitejs/plugin-react"] ||
        deps.react ||
        /\bvite\b/.test(pkg.scripts?.dev || "")
      ) kind = "vite";
    } catch {
      kind = "static";
    }
  }

  if (kind === "static") return startStaticServer(sandbox);

  await sandbox.commands.run("npm install --prefer-offline --no-audit --no-fund", {
    cwd: PROJECT_ROOT,
    timeoutMs: 240_000,
  });

  if (kind === "vite") {
    await sandbox.commands.run(
      "npx vite --host 0.0.0.0 --port 3000 --strictPort",
      { background: true, cwd: PROJECT_ROOT },
    );
  } else {
    await sandbox.commands.run(
      "npx next dev -H 0.0.0.0 -p 3000",
      { background: true, cwd: PROJECT_ROOT },
    );
  }

  return publicUrl(sandbox, PREVIEW_PORT);
}

const BLOCKED = /\b(rm\s+-rf\s+\/|mkfs|dd\s+if=|shutdown|reboot|:(){:|:&};:)\b/i;

export function assertSafeCommand(cmd: string) {
  const t = cmd.trim();
  if (!t) throw new Error("Empty command");
  if (t.length > 2000) throw new Error("Command too long");
  if (BLOCKED.test(t)) throw new Error("Command blocked for safety");
  return t;
}
