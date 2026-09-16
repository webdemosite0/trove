"use client";

import type { ProjectFile } from "@/lib/builder";

type RuntimeStatus = "idle" | "booting" | "syncing" | "installing" | "starting" | "ready" | "error";

type RuntimeSnapshot = {
  status: RuntimeStatus;
  url: string | null;
  port: number;
  error: string | null;
  output: string[];
};

type RuntimeStore = {
  snapshot: RuntimeSnapshot;
  listeners: Set<(snapshot: RuntimeSnapshot) => void>;
  syncPromise: Promise<void> | null;
  mountedFingerprint: string;
  projectScope: string;
};

const STORE_KEY = "__troveE2BRuntimeV1";

function createStore(): RuntimeStore {
  return {
    snapshot: {
      status: "idle",
      url: null,
      port: 5173,
      error: null,
      output: [],
    },
    listeners: new Set(),
    syncPromise: null,
    mountedFingerprint: "",
    projectScope: "",
  };
}

function getStore(): RuntimeStore {
  const root = globalThis as typeof globalThis & Record<string, unknown>;
  const existing = root[STORE_KEY] as RuntimeStore | undefined;
  if (existing) return existing;
  const fresh = createStore();
  root[STORE_KEY] = fresh;
  return fresh;
}

const store = getStore();

function publish(next: Partial<RuntimeSnapshot> = {}) {
  store.snapshot = { ...store.snapshot, ...next };
  for (const listener of store.listeners) listener(store.snapshot);
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function appendOutput(value: string) {
  const clean = stripAnsi(String(value || "")).replace(/\r/g, "");
  const chunks = clean.split("\n").filter(Boolean);
  if (!chunks.length) return;
  publish({ output: [...store.snapshot.output, ...chunks].slice(-300) });
}

function projectIdFromUrl() {
  if (typeof window === "undefined") return "";
  return new URL(window.location.href).searchParams.get("c")?.trim() || "";
}

function fingerprint(files: ProjectFile[]) {
  let hash = 2166136261;
  for (const file of files) {
    const source = `${file.path}\u0000${file.content}\u0001`;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(36);
}

async function readJson(res: Response) {
  return res.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

export async function syncLocalProject(files: ProjectFile[]) {
  if (!files.length) return;

  const nextFingerprint = fingerprint(files);
  const projectId = projectIdFromUrl();
  const scope = projectId || "draft";

  if (
    nextFingerprint === store.mountedFingerprint &&
    store.projectScope === scope &&
    store.snapshot.status === "ready" &&
    store.snapshot.url
  ) {
    return;
  }

  if (store.syncPromise) {
    await store.syncPromise.catch(() => undefined);
    if (
      nextFingerprint === store.mountedFingerprint &&
      store.projectScope === scope &&
      store.snapshot.status === "ready" &&
      store.snapshot.url
    ) {
      return;
    }
  }

  store.syncPromise = (async () => {
    try {
      publish({
        status: store.snapshot.url ? "syncing" : "booting",
        error: null,
      });
      appendOutput(store.snapshot.url ? "Syncing project to sandbox…" : "Starting project sandbox…");

      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, projectId: projectId || null }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(String(data?.error || `Sandbox failed (${res.status})`));
      }

      const url = typeof data?.url === "string" ? data.url : null;
      if (!url) throw new Error("Sandbox started without a preview URL.");

      store.mountedFingerprint = nextFingerprint;
      store.projectScope = scope;
      publish({
        status: "ready",
        url,
        port: Number(data?.port) || 5173,
        error: null,
      });
      appendOutput(
        data?.reused
          ? "Reconnected to the existing Trove sandbox."
          : "Trove sandbox is ready.",
      );
      appendOutput("Preview server ready on http://localhost:5173");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sandbox failed to start.";
      publish({ status: "error", error: message });
      appendOutput(`runtime: ${message}`);
    } finally {
      store.syncPromise = null;
    }
  })();

  await store.syncPromise;
}

export async function runLocalCommand(command: string) {
  const value = command.trim();
  if (!value) return;

  appendOutput(`$ ${value}`);
  const projectId = projectIdFromUrl();

  try {
    const res = await fetch("/api/sandbox/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: value, projectId: projectId || null }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      throw new Error(String(data?.error || `Command failed (${res.status})`));
    }

    if (typeof data?.stdout === "string" && data.stdout) appendOutput(data.stdout);
    if (typeof data?.stderr === "string" && data.stderr) appendOutput(data.stderr);
    const exitCode = Number(data?.exitCode ?? 0);
    if (exitCode !== 0) appendOutput(`process exited with code ${exitCode}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    appendOutput(`terminal: ${message}`);
  }
}

export function clearLocalOutput() {
  publish({ output: [] });
}

export function getLocalRuntimeSnapshot() {
  return store.snapshot;
}

export function subscribeLocalRuntime(listener: (value: RuntimeSnapshot) => void) {
  store.listeners.add(listener);
  listener(store.snapshot);
  return () => {
    store.listeners.delete(listener);
  };
}
