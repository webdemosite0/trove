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

  // Batch writes (E2B accepts multiple files)
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

  return sandbox;
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
  // brief wait so the port is listening
  await sandbox.commands.run("sleep 1").catch(() => undefined);
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
