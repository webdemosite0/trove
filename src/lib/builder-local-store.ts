/**
 * Local builder store disabled. Chat, files, and preview are saved on the
 * server database for the signed-in user (Google / Gmail or email).
 * Stubs keep leftover imports from breaking the build.
 */

export type BuilderChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

export type BuilderLocalSnapshot = {
  v: 1;
  projectId: string;
  idea: string;
  phase: string;
  messages: BuilderChatMsg[];
  files: unknown[];
  preview: string | null;
  plan: unknown;
  answers: Record<string, string>;
  storage: "local" | "none";
  pane?: string;
  title?: string;
  updatedAt: number;
};

export function newLocalProjectId(): string {
  return "";
}

export function saveBuilderLocal(_snap: BuilderLocalSnapshot): void {
  /* no-op — use /api/builder/projects */
}

export function loadBuilderLocal(_projectId: string | null | undefined): null {
  return null;
}

export function loadLastBuilderLocal(): null {
  return null;
}

export function clearBuilderLocal(_projectId: string): void {
  /* no-op */
}
