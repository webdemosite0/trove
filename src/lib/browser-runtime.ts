/* eslint-disable @typescript-eslint/no-explicit-any -- WebContainer is loaded dynamically at runtime, so its SDK types are intentionally not a build dependency. */
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

type WebContainerLike = {
  workdir: string;
  mount: (tree: Record<string, unknown>) => Promise<void>;
  spawn: (command: string, args?: string[], options?: Record<string, unknown>) => Promise<any>;
  on: (event: string, cb: (...args: any[]) => void) => (() => void) | void;
};

type RuntimeStore = {
  snapshot: RuntimeSnapshot;
  listeners: Set<(snapshot: RuntimeSnapshot) => void>;
  bootPromise: Promise<WebContainerLike> | null;
  container: WebContainerLike | null;
  serverProcess: any;
  shellProcess: any;
  shellWriter: WritableStreamDefaultWriter<string> | null;
  packageFingerprint: string;
  mountedFingerprint: string;
  syncPromise: Promise<void> | null;
};

const CDN = "https://cdn.jsdelivr.net/npm/@webcontainer/api@1.6.4/+esm";
const STORE_KEY = "__troveWebContainerRuntimeV1";

function createStore(): RuntimeStore {
  return {
    snapshot: {
      status: "idle",
      url: null,
      port: 5173,
      error: null,
      output: [],
    },
    listeners: new Set<(snapshot: RuntimeSnapshot) => void>(),
    bootPromise: null,
    container: null,
    serverProcess: null,
    shellProcess: null,
    shellWriter: null,
    packageFingerprint: "",
    mountedFingerprint: "",
    syncPromise: null,
  };
}

/**
 * WebContainer.boot() may only create one live instance per page. Next.js can
 * re-evaluate client modules during navigation/HMR, so module-level variables
 * are not strong enough to enforce that invariant. Keep the runtime on
 * globalThis so Preview and Terminal always reuse the same instance.
 */
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
  if (!clean) return;
  const chunks = clean.split("\n").filter(Boolean);
  if (!chunks.length) return;
  publish({ output: [...store.snapshot.output, ...chunks].slice(-240) });
}

function safePath(raw: string) {
  return String(raw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function defaultPackage() {
  return JSON.stringify(
    {
      name: "trove-local-preview",
      private: true,
      type: "module",
      scripts: { dev: "vite --host 0.0.0.0 --port 5173" },
      dependencies: { react: "18.3.1", "react-dom": "18.3.1" },
      devDependencies: { vite: "6.0.11", "@vitejs/plugin-react": "4.3.1" },
    },
    null,
    2,
  );
}

function normalizeFiles(files: ProjectFile[]) {
  const cleaned = files
    .map((file) => ({ path: safePath(file.path), content: String(file.content ?? "") }))
    .filter((file) => file.path);

  if (!cleaned.some((file) => file.path === "package.json")) {
    cleaned.push({ path: "package.json", content: defaultPackage() });
  }
  return cleaned;
}

function toTree(files: { path: string; content: string }[]) {
  const tree: Record<string, any> = {};
  for (const file of files) {
    const parts = file.path.split("/");
    let node = tree;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (i === parts.length - 1) {
        node[part] = { file: { contents: file.content } };
      } else {
        node[part] ||= { directory: {} };
        node = node[part].directory;
      }
    }
  }
  return tree;
}

function fingerprint(files: { path: string; content: string }[]) {
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

async function loadWebContainer(): Promise<WebContainerLike> {
  if (store.container) return store.container;
  if (store.bootPromise) return store.bootPromise;

  store.bootPromise = (async () => {
    publish({ status: "booting", error: null });
    if (typeof window === "undefined") throw new Error("Local runtime only runs in the browser.");
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      throw new Error("Local preview requires HTTPS.");
    }

    const dynamicImport = new Function("url", "return import(url)") as (url: string) => Promise<any>;
    const mod = await dynamicImport(CDN);
    if (!mod?.WebContainer?.boot) throw new Error("Local runtime could not load.");

    const wc = (await mod.WebContainer.boot({
      coep: "credentialless",
      workdirName: "trove-project",
      forwardPreviewErrors: "exceptions-only",
    })) as WebContainerLike;

    // Assign immediately after boot so every later caller can reuse it.
    store.container = wc;

    wc.on("server-ready", (port: number, url: string) => {
      publish({ status: "ready", port: Number(port) || 5173, url: String(url), error: null });
      appendOutput(`Local server ready on http://localhost:${port}`);
    });
    wc.on("error", (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error || "Local runtime error");
      publish({ status: "error", error: message });
      appendOutput(`runtime: ${message}`);
    });

    appendOutput("Trove local runtime booted in your browser.");
    return wc;
  })().catch((error) => {
    store.bootPromise = null;
    const raw = error instanceof Error ? error.message : "Local runtime failed to start.";
    const message = /more instances|single instance|already.*instance/i.test(raw)
      ? "The local runtime was already started by this tab. Refresh this Trove page once to reconnect to the shared runtime."
      : raw;
    publish({ status: "error", error: message });
    throw error;
  });

  return store.bootPromise;
}

async function pipeProcess(process: any, prefix?: string) {
  if (!process?.output?.pipeTo) return;
  void process.output
    .pipeTo(
      new WritableStream<string>({
        write(data) {
          appendOutput(prefix ? `${prefix}${data}` : data);
        },
      }),
    )
    .catch(() => undefined);
}

async function installIfNeeded(wc: WebContainerLike, files: { path: string; content: string }[]) {
  const pkg = files.find((file) => file.path === "package.json")?.content || defaultPackage();
  if (pkg === store.packageFingerprint) return false;
  publish({ status: "installing", error: null });
  appendOutput("$ npm install --no-audit --no-fund");
  const install = await wc.spawn("npm", ["install", "--no-audit", "--no-fund"]);
  await pipeProcess(install);
  const exit = await install.exit;
  if (exit !== 0) throw new Error(`npm install exited with code ${exit}`);
  store.packageFingerprint = pkg;
  return true;
}

async function startServer(wc: WebContainerLike, restart = false) {
  if (store.serverProcess && !restart) return;
  if (store.serverProcess?.kill) {
    try {
      store.serverProcess.kill();
    } catch {
      // Ignore stale process handles.
    }
  }
  publish({ status: "starting", error: null, url: restart ? null : store.snapshot.url });
  appendOutput("$ npm run dev -- --host 0.0.0.0 --port 5173");
  store.serverProcess = await wc.spawn("npm", ["run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]);
  await pipeProcess(store.serverProcess);
}

export async function syncLocalProject(files: ProjectFile[]) {
  if (!files.length) return;
  const normalized = normalizeFiles(files);
  const nextFingerprint = fingerprint(normalized);
  if (nextFingerprint === store.mountedFingerprint && store.snapshot.status !== "error") return;

  if (store.syncPromise) await store.syncPromise.catch(() => undefined);
  store.syncPromise = (async () => {
    try {
      const wc = await loadWebContainer();
      publish({ status: "syncing", error: null });
      await wc.mount(toTree(normalized));
      const packageChanged = await installIfNeeded(wc, normalized);
      store.mountedFingerprint = nextFingerprint;
      await startServer(wc, packageChanged);
      if (store.snapshot.url) publish({ status: "ready" });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Local runtime failed.";
      const message = /more instances|single instance|already.*instance/i.test(raw)
        ? "The local runtime was already started by this tab. Refresh this Trove page once to reconnect to the shared runtime."
        : raw;
      publish({ status: "error", error: message });
      appendOutput(`error: ${message}`);
    } finally {
      store.syncPromise = null;
    }
  })();
  await store.syncPromise;
}

async function ensureShell() {
  const wc = await loadWebContainer();
  if (store.shellWriter) return store.shellWriter;
  store.shellProcess = await wc.spawn("jsh", [], { terminal: { cols: 92, rows: 28 } });
  await pipeProcess(store.shellProcess);
  const writer = store.shellProcess.input.getWriter() as WritableStreamDefaultWriter<string>;
  store.shellWriter = writer;
  return writer;
}

export async function runLocalCommand(command: string) {
  const value = command.trim();
  if (!value) return;
  appendOutput(`$ ${value}`);
  const writer = await ensureShell();
  await writer.write(`${value}\n`);
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
