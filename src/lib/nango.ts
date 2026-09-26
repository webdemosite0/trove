import "server-only";

/**
 * Nango has been removed. OAuth tool connections use Composio (see src/lib/composio.ts).
 * These stubs keep any lingering imports from breaking the build.
 */

export const NANGO_MAP: Record<string, string> = {};

export const PREFER_TOKEN_CONNECT = new Set<string>();

export function nangoEnabled(): boolean {
  return false;
}

export function nangoIntegrationFor(_service: string): string | null {
  return null;
}

export function serviceForNango(_integration: string): string | null {
  return null;
}

export async function createNangoSession(_service: string): Promise<never> {
  throw new Error("Nango is no longer used. Connect tools via Composio on /integrations.");
}

export async function resolveNangoAccessToken(
  _integration: string,
  _connectionId: string,
): Promise<string | null> {
  return null;
}

export async function syncNangoConnections(): Promise<{ synced: string[] }> {
  return { synced: [] };
}

export async function listLocalNangoServices(): Promise<string[]> {
  return [];
}
