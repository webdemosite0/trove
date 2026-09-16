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

type RuntimeRegistry = {
  stores: Map<string, RuntimeStore>;
};

const REGISTRY_KEY = "__troveE2BRuntimeRegistryV2";

function projectIdFromUrl() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  const queryId = url.searchParams.get("c")?.trim();
  if (queryId) return queryId;

  const topLevel = url.pathname.match(/^\/project\/([^/]+)(?:\/|$)/i);
  if (topLevel?.[1]) return decodeURIComponent(topLevel[1]).trim();

  // Keep legacy project URLs readable during migration.
  const legacy = url.pathname.match(/^\/websites\/project\/([^/]+)(?:\/|$)/i);
  if (legacy?.[1]) return decodeURIComponent(legacy[1]).trim();

  const rootId = document
    .querySelector<HTMLElement>("[data-trove-project-id]")
    ?.dataset.troveProjectId?.trim();
  return rootId || "";
}

function createStore(scope: string): RuntimeStore {
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
    projectScope: scope,
  };
}

function getRegistry(): RuntimeRegistry {
  const root = globalThis as typeof globalThis & Record<string, unknown>;
  const existing = root[REGISTRY_KEY] as RuntimeRegistry | undefined;
  if (existing) return existing;

  const fresh: RuntimeRegistry = { stores: new Map() };
  root[REGISTRY_KEY] = fresh;
  return fresh;
}

const registry = getRegistry();

function getStore(explicitProjectId?: string | null) {
  const scope = explicitProjectId?.trim() || projectIdFromUrl();
  const key = scope || "__unsaved__";
  const existing = registry.stores.get(key);
  if (existing) return existing;

  const fresh = createStore(scope);
  registry.stores.set(key, fresh);
  return fresh;
}

function publish(store: RuntimeStore, next: Partial<RuntimeSnapshot> = {}) {
  store.snapshot = { ...store.snapshot, ...next };
  for (const listener of store.listeners) listener(store.snapshot);
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function appendOutput(store: RuntimeStore, value: string) {
  const clean = stripAnsi(String(value || "")).replace(/\r/g, "");
  const chunks = clean.split("\n").filter(Boolean);
  if (!chunks.length) return;
  publish(store, { output: [...store.snapshot.output, ...chunks].slice(-300) });
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

export async function syncLocalProject(files: ProjectFile[], explicitProjectId?: string | null) {
  if (!files.length) return;

  const projectId = explicitProjectId?.trim() || projectIdFromUrl();
  const store = getStore(projectId);

  if (!projectId) {
    const message = "This site does not have its own project workspace yet.";
    publish(store, { status: "error", error: message, url: null });
    appendOutput(store, `runtime: ${message}`);
    return;
  }

  const nextFingerprint = fingerprint(files);

  if (
    nextFingerprint === store.mountedFingerprint &&
    store.projectScope === projectId &&
    store.snapshot.status === "ready" &&
    store.snapshot.url
  ) {
    return;
  }

  if (store.syncPromise) {
    await store.syncPromise.catch(() => undefined);
    if (
      nextFingerprint === store.mountedFingerprint &&
      store.projectScope === projectId &&
      store.snapshot.status === "ready" &&
      store.snapshot.url
    ) {
      return;
    }
  }

  store.syncPromise = (async () => {
    try {
      publish(store, {
        status: store.snapshot.url ? "syncing" : "booting",
        error: null,
      });
      appendOutput(
        store,
        store.snapshot.url
          ? `Syncing ${projectId} to its sandbox…`
          : `Starting isolated sandbox for ${projectId}…`,
      );

      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, projectId }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(String(data?.error || `Sandbox failed (${res.status})`));
      }

      const url = typeof data?.url === "string" ? data.url : null;
      if (!url) throw new Error("Sandbox started without a preview URL.");

      store.mountedFingerprint = nextFingerprint;
      store.projectScope = projectId;
      publish(store, {
        status: "ready",
        url,
        port: Number(data?.port) || 5173,
        error: null,
      });

      if (data?.packageChanged) {
        appendOutput(store, "Dependencies installed for this project workspace.");
      } else {
        appendOutput(store, "Dependencies already cached for this project.");
      }
      appendOutput(
        store,
        data?.reused
          ? "Reconnected to this project's existing Trove sandbox."
          : "This project's Trove sandbox is ready.",
      );
      appendOutput(store, "Preview server ready on http://localhost:5173");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sandbox failed to start.";
      publish(store, { status: "error", error: message, url: null });
      appendOutput(store, `runtime: ${message}`);
    } finally {
      store.syncPromise = null;
    }
  })();

  await store.syncPromise;
}

/** Backend-agent shell bridge. No user-facing terminal route consumes this. */
export async function runLocalCommand(command: string, explicitProjectId?: string | null) {
  const value = command.trim();
  if (!value) return;

  const projectId = explicitProjectId?.trim() || projectIdFromUrl();
  const store = getStore(projectId);
  appendOutput(store, `$ ${value}`);

  if (!projectId) {
    appendOutput(store, "terminal: Save this site before running commands.");
    return;
  }

  try {
    const res = await fetch("/api/sandbox/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: value, projectId }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      throw new Error(String(data?.error || `Command failed (${res.status})`));
    }

    if (typeof data?.stdout === "string" && data.stdout) appendOutput(store, data.stdout);
    if (typeof data?.stderr === "string" && data.stderr) appendOutput(store, data.stderr);
    const exitCode = Number(data?.exitCode ?? 0);
    if (exitCode !== 0) appendOutput(store, `process exited with code ${exitCode}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    appendOutput(store, `terminal: ${message}`);
  }
}

export function clearLocalOutput(explicitProjectId?: string | null) {
  publish(getStore(explicitProjectId), { output: [] });
}

export function getLocalRuntimeSnapshot(explicitProjectId?: string | null) {
  return getStore(explicitProjectId).snapshot;
}

export function subscribeLocalRuntime(
  listener: (value: RuntimeSnapshot) => void,
  explicitProjectId?: string | null,
) {
  const store = getStore(explicitProjectId);
  store.listeners.add(listener);
  listener(store.snapshot);
  return () => {
    store.listeners.delete(listener);
  };
}
