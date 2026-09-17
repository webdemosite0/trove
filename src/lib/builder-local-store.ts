/**
 * Client-side project snapshot so refresh keeps chat, files, and preview.
 * Server save remains the source of truth when signed in; local is always written.
 */

import type { BuildPlan, ProjectFile } from "@/lib/builder";

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
  files: ProjectFile[];
  preview: string | null;
  plan: BuildPlan | null;
  answers: Record<string, string>;
  storage: "local" | "none";
  pane?: string;
  title?: string;
  updatedAt: number;
};

const PREFIX = "trove:builder:v1:";
const LAST_KEY = "trove:builder:v1:last";

function keyFor(projectId: string) {
  return `${PREFIX}${projectId}`;
}

export function newLocalProjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function saveBuilderLocal(snap: BuilderLocalSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const id = snap.projectId?.trim();
    if (!id) return;
    const payload: BuilderLocalSnapshot = {
      ...snap,
      v: 1,
      projectId: id,
      updatedAt: Date.now(),
      messages: Array.isArray(snap.messages) ? snap.messages.slice(-200) : [],
      files: Array.isArray(snap.files) ? snap.files : [],
    };
    localStorage.setItem(keyFor(id), JSON.stringify(payload));
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // Quota / private mode — ignore.
  }
}

export function loadBuilderLocal(projectId: string | null | undefined): BuilderLocalSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const id = projectId?.trim();
    if (!id) return null;
    const raw = localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const data = JSON.parse(raw) as BuilderLocalSnapshot;
    if (!data || data.v !== 1 || data.projectId !== id) return null;
    return data;
  } catch {
    return null;
  }
}

/** Most recently edited project in this browser. */
export function loadLastBuilderLocal(): BuilderLocalSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const last = localStorage.getItem(LAST_KEY)?.trim();
    if (!last) return null;
    return loadBuilderLocal(last);
  } catch {
    return null;
  }
}

export function clearBuilderLocal(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor(projectId));
    if (localStorage.getItem(LAST_KEY) === projectId) {
      localStorage.removeItem(LAST_KEY);
    }
  } catch {
    // ignore
  }
}
