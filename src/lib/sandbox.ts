import "server-only";

/**
 * Trove Sites no longer depend on a server-side sandbox provider.
 * Preview and terminal execution run in the browser-local runtime instead.
 *
 * These compatibility exports remain temporarily so older routes/components
 * fail clearly instead of pulling an E2B SDK into the production bundle.
 */
export const PROJECT_ROOT = "/home/user/project";
export const PREVIEW_PORT = 5173;

export function sandboxConfigured() {
  return false;
}

export function requireE2BKey(): never {
  throw new Error("Server sandboxes are disabled. Trove Sites uses the browser-local runtime.");
}

export async function createProjectSandbox(): Promise<never> {
  throw new Error("Server sandboxes are disabled. Trove Sites uses the browser-local runtime.");
}

export async function connectSandbox(): Promise<never> {
  throw new Error("Server sandboxes are disabled. Trove Sites uses the browser-local runtime.");
}

export function publicUrl(): string {
  return "http://localhost:5173";
}

export async function startStaticServer(): Promise<never> {
  throw new Error("Server sandboxes are disabled. Trove Sites uses the browser-local runtime.");
}

export async function startPreviewServer(): Promise<never> {
  throw new Error("Server sandboxes are disabled. Trove Sites uses the browser-local runtime.");
}

const BLOCKED = /\b(rm\s+-rf\s+\/|mkfs|dd\s+if=|shutdown|reboot|:(){:|:&};:)\b/i;

export function assertSafeCommand(cmd: string) {
  const value = cmd.trim();
  if (!value) throw new Error("Empty command");
  if (value.length > 2000) throw new Error("Command too long");
  if (BLOCKED.test(value)) throw new Error("Command blocked for safety");
  return value;
}
