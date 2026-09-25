"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiCode,
  FiExternalLink,
  FiFile,
  FiLoader,
  FiPlay,
  FiRefreshCw,
  FiTerminal,
  FiX,
  FiZap,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  runLocalProjectTask,
  startLocalDevServer,
  type LocalProjectFile,
} from "@/lib/local-project";

type WorkspaceStatus = "idle" | "syncing" | "ready" | "error";
type WorkspaceTab = "preview" | "files" | "console";

type FileEntry = {
  path: string;
  bytes: number;
};

type LocalRuntimeProject = {
  name: string;
  scope: string;
  files: LocalProjectFile[];
  native?: boolean;
};

export function BrowserWorkspace({
  projectId,
  projectName,
  localProject,
  compact = false,
}: {
  projectId?: string | null;
  projectName?: string | null;
  localProject?: LocalRuntimeProject | null;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<WorkspaceStatus>("idle");
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>("preview");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [terminalEnabled, setTerminalEnabled] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const syncGeneration = useRef(0);

  const active = Boolean(projectId || localProject);
  const name = localProject?.name || projectName || "Project";

  const localFingerprint = useMemo(() => {
    if (!localProject) return "";
    let hash = 2166136261;
    for (const file of localProject.files) {
      const source = `${file.path}:${file.content.length};`;
      for (let index = 0; index < source.length; index += 1) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
    return (hash >>> 0).toString(36);
  }, [localProject]);

  const append = useCallback((value: string) => {
    const rows = String(value || "")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);
    if (!rows.length) return;
    setOutput((current) => [...current, ...rows].slice(-400));
  }, []);

  const sync = useCallback(async () => {
    if (!active) return;

    const generation = ++syncGeneration.current;
    setStatus("syncing");
    setError("");
    append(`workspace: syncing ${name}…`);

    try {
      if (localProject?.native) {
        append("workspace: starting local dev server on your device…");
        const data = await startLocalDevServer(localProject.scope);
        if (!mounted.current || generation !== syncGeneration.current) return;

        if (!data.running || !data.url) {
          throw new Error(
            data.stderr || "Local dev automation was not started.",
          );
        }

        setUrl(data.url);
        setFiles(
          localProject.files.map((file) => ({
            path: file.path,
            bytes: new Blob([file.content]).size,
          })),
        );
        setTerminalEnabled(false);
        setStatus("ready");
        append(
          data.reused
            ? "workspace: local dev server already running"
            : "workspace: local dev server started automatically",
        );
        if (data.installed) append("workspace: dependencies installed");
        if (data.command) append("$ " + data.command);
        if (data.stdout) append(data.stdout);
        if (data.stderr) append(data.stderr);
      } else {
        const res = await fetch("/api/browser-workspace/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            localProject
              ? {
                  localScope: localProject.scope,
                  files: localProject.files,
                }
              : { projectId },
          ),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Could not start Browser Workspace.");
        }
        if (!mounted.current || generation !== syncGeneration.current) return;

        setUrl(String(data?.url || ""));
        setFiles(Array.isArray(data?.files) ? data.files : []);
        setTerminalEnabled(Boolean(data?.terminalEnabled));
        setStatus("ready");
        append(
          data?.reused
            ? "workspace: reconnected to existing runtime"
            : "workspace: isolated runtime ready",
        );
        if (data?.packageChanged) {
          append("workspace: dependencies installed or updated");
        }
      }
    } catch (cause) {
      if (!mounted.current || generation !== syncGeneration.current) return;
      const message =
        cause instanceof Error ? cause.message : "Could not start Browser Workspace.";
      setError(message);
      setStatus("error");
      append(`workspace: ${message}`);
    }
  }, [active, append, localProject, name, projectId]);

  const run = useCallback(
    async (opts: {
      action?: "build" | "typecheck" | "lint" | "test";
      command?: string;
    }) => {
      if (status !== "ready" || running) return;
      const label = opts.action || opts.command || "command";
      setRunning(label);
      setTab("console");
      setExpanded(true);
      append(`$ ${opts.action ? `[${opts.action}]` : opts.command}`);

      try {
        if (localProject?.native) {
          if (!opts.action) {
            throw new Error(
              "Custom shell commands are not exposed to the web UI for local folders.",
            );
          }
          const data = await runLocalProjectTask(localProject.scope, opts.action);
          if (data?.stdout) append(String(data.stdout));
          if (data?.stderr) append(String(data.stderr));
          if (data?.cancelled) {
            append("– local task cancelled");
          } else {
            append(
              Number(data?.code || 0) === 0
                ? "✓ command finished successfully"
                : `✗ command exited with code ${Number(data?.code || 1)}`,
            );
          }
        } else {
          const res = await fetch("/api/browser-workspace/exec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: projectId || undefined,
              localScope: localProject?.scope || undefined,
              ...opts,
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error || "Workspace command failed.");

          if (data?.stdout) append(String(data.stdout));
          if (data?.stderr) append(String(data.stderr));
          append(
            Number(data?.exitCode || 0) === 0
              ? "✓ command finished successfully"
              : `✗ command exited with code ${Number(data?.exitCode || 1)}`,
          );
        }
      } catch (cause) {
        append(
          `✗ ${cause instanceof Error ? cause.message : "Workspace command failed."}`,
        );
      } finally {
        setRunning("");
      }
    },
    [append, localProject?.scope, projectId, running, status],
  );

  const verify = useCallback(async () => {
    if (status !== "ready" || running) return;
    setRunning("verify");
    setTab("console");
    setExpanded(true);
    append("verify: typecheck → lint → test → build");

    try {
      for (const action of ["typecheck", "lint", "test", "build"] as const) {
        append(`$ [${action}]`);

        if (localProject?.native) {
          const data = await runLocalProjectTask(localProject.scope, action);
          if (data?.cancelled) {
            append(`– ${action} cancelled`);
            continue;
          }
          if (data?.stdout) append(String(data.stdout));
          if (data?.stderr) append(String(data.stderr));
          if (Number(data?.code || 0) !== 0) {
            throw new Error(
              `${action} exited with code ${Number(data?.code || 1)}.`,
            );
          }
          append(`✓ ${action} passed`);
          continue;
        }

        const res = await fetch("/api/browser-workspace/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectId || undefined,
            localScope: localProject?.scope || undefined,
            action,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `${action} failed.`);
        }
        if (data?.stdout) append(String(data.stdout));
        if (data?.stderr) append(String(data.stderr));
        if (Number(data?.exitCode || 0) !== 0) {
          throw new Error(`${action} exited with code ${Number(data?.exitCode || 1)}.`);
        }
        append(data?.skipped ? `– ${action} skipped (no script/tool)` : `✓ ${action} passed`);
      }
      append("✓ verify complete — project is ready to preview");
    } catch (cause) {
      append(
        `✗ ${cause instanceof Error ? cause.message : "Project verification failed."}`,
      );
    } finally {
      setRunning("");
    }
  }, [append, localProject?.scope, projectId, running, status]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      setUrl("");
      setFiles([]);
      setOutput([]);
      setError("");
      setExpanded(false);
      return;
    }
    void sync();
  }, [active, projectId, localProject?.scope, localFingerprint, sync]);

  useEffect(() => {
    const onProjectChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (projectId && detail?.projectId === projectId) {
        void sync();
      }
    };
    window.addEventListener("trove:project-changed", onProjectChanged);
    return () => window.removeEventListener("trove:project-changed", onProjectChanged);
  }, [projectId, sync]);

  if (!active) return null;

  const statusText =
    status === "syncing"
      ? "Starting runtime…"
      : status === "ready"
        ? localProject?.native
          ? "Local dev server running"
          : "Browser workspace ready"
        : status === "error"
          ? "Workspace needs attention"
          : "Browser workspace";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] border border-violet-400/20 bg-raised shadow-[var(--sh-2)]",
        compact && "rounded-2xl",
      )}
    >
      <div
        className="relative flex items-center gap-3 px-3.5 py-3 sm:px-4"
        style={{
          background:
            "linear-gradient(110deg, color-mix(in oklab,var(--color-violet) 14%,transparent), color-mix(in oklab,var(--color-accent) 10%,transparent), color-mix(in oklab,#22d3ee 8%,transparent))",
        }}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 text-violet-600 ring-1 ring-violet-400/15 dark:text-violet-300">
          {status === "syncing" ? (
            <FiLoader size={16} className="animate-spin" />
          ) : status === "ready" ? (
            <FiZap size={16} />
          ) : (
            <FiCode size={16} />
          )}
        </span>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[12.5px] font-semibold text-ink">
            {name}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-[10.5px]",
              status === "error" ? "text-critical" : "text-ink-4",
            )}
          >
            {statusText}
          </span>
        </button>

        {status === "ready" ? (
          <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-emerald-600 sm:inline-flex dark:text-emerald-300">
            <FiCheck size={10} />
            {localProject?.native ? "Local" : "Live"}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => void sync()}
          disabled={status === "syncing"}
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-50"
          aria-label="Refresh Browser Workspace"
          title="Refresh runtime"
        >
          <FiRefreshCw size={14} className={status === "syncing" ? "animate-spin" : ""} />
        </button>

        {url ? (
          <button
            type="button"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
            aria-label="Open preview in new tab"
            title="Open preview"
          >
            <FiExternalLink size={14} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
          aria-label={expanded ? "Collapse Browser Workspace" : "Expand Browser Workspace"}
        >
          <FiChevronDown
            size={14}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      {error ? (
        <div className="border-t border-critical/20 bg-critical-soft px-4 py-2 text-[11.5px] text-critical">
          {error}
        </div>
      ) : null}

      {!expanded ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3.5 py-2.5">
          <QuickAction
            label={running === "verify" ? "Verifying…" : "Verify"}
            icon={running === "verify" ? <FiLoader size={12} className="animate-spin" /> : <FiZap size={12} />}
            disabled={status !== "ready" || Boolean(running)}
            onClick={() => void verify()}
          />
          <QuickAction
            label="Build"
            icon={<FiPlay size={12} />}
            disabled={status !== "ready" || Boolean(running)}
            onClick={() => void run({ action: "build" })}
          />
          <QuickAction
            label="Typecheck"
            icon={<FiCode size={12} />}
            disabled={status !== "ready" || Boolean(running)}
            onClick={() => void run({ action: "typecheck" })}
          />
          <QuickAction
            label="Lint"
            icon={<FiCheck size={12} />}
            disabled={status !== "ready" || Boolean(running)}
            onClick={() => void run({ action: "lint" })}
          />
          <QuickAction
            label="Test"
            icon={<FiCheck size={12} />}
            disabled={status !== "ready" || Boolean(running)}
            onClick={() => void run({ action: "test" })}
          />
          <span className="ml-auto text-[10.5px] text-ink-4">
            {files.length ? `${files.length} files synced` : "Preparing files…"}
          </span>
        </div>
      ) : (
        <div className="border-t border-line">
          <div className="flex items-center gap-1 border-b border-line bg-sunk/45 px-2 py-1.5">
            {(
              [
                ["preview", "Preview", FiPlay],
                ["files", "Files", FiFile],
                ["console", "Console", FiTerminal],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium transition",
                  tab === id
                    ? "bg-raised text-ink shadow-[var(--sh-1)]"
                    : "text-ink-4 hover:bg-hover hover:text-ink",
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}

            <span className="flex-1" />

            <QuickAction
              label={running === "verify" ? "Verifying…" : "Verify"}
              icon={running === "verify" ? <FiLoader size={12} className="animate-spin" /> : <FiZap size={12} />}
              disabled={status !== "ready" || Boolean(running)}
              onClick={() => void verify()}
            />
            <QuickAction
              label={running === "build" ? "Building…" : "Build"}
              icon={running === "build" ? <FiLoader size={12} className="animate-spin" /> : <FiPlay size={12} />}
              disabled={status !== "ready" || Boolean(running)}
              onClick={() => void run({ action: "build" })}
            />
          </div>

          {tab === "preview" ? (
            <div className={cn("relative bg-white", compact ? "h-[300px]" : "h-[420px]")}>
              {url && status === "ready" ? (
                <iframe
                  src={url}
                  title={`${name} live preview`}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                />
              ) : (
                <div className="grid h-full place-items-center bg-canvas p-6 text-center">
                  <div>
                    <FiLoader
                      size={18}
                      className={cn(
                        "mx-auto text-accent",
                        status === "syncing" && "animate-spin",
                      )}
                    />
                    <p className="mt-2 text-[12px] text-ink-3">
                      {status === "error"
                        ? "Refresh the workspace to retry."
                        : "Preparing the live project preview…"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {tab === "files" ? (
            <div className={cn("overflow-y-auto bg-canvas p-2", compact ? "max-h-[300px]" : "max-h-[420px]")}>
              {files.length ? (
                files.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] hover:bg-hover"
                  >
                    <FiFile size={12} className="shrink-0 text-violet-500 dark:text-violet-300" />
                    <span className="min-w-0 flex-1 truncate font-mono text-ink-2">
                      {file.path}
                    </span>
                    <span className="text-[10px] text-ink-4">
                      {formatBytes(file.bytes)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-[11.5px] text-ink-4">No synced files yet.</p>
              )}
            </div>
          ) : null}

          {tab === "console" ? (
            <div className={cn("flex flex-col bg-[#0c0b14] text-zinc-200", compact ? "h-[300px]" : "h-[420px]")}>
              <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-2.5 py-2">
                <ConsoleAction
                  label={running === "verify" ? "Verifying…" : "Verify all"}
                  disabled={status !== "ready" || Boolean(running)}
                  onClick={() => void verify()}
                />
                <ConsoleAction
                  label="Build"
                  disabled={status !== "ready" || Boolean(running)}
                  onClick={() => void run({ action: "build" })}
                />
                <ConsoleAction
                  label="Typecheck"
                  disabled={status !== "ready" || Boolean(running)}
                  onClick={() => void run({ action: "typecheck" })}
                />
                <ConsoleAction
                  label="Lint"
                  disabled={status !== "ready" || Boolean(running)}
                  onClick={() => void run({ action: "lint" })}
                />
                <ConsoleAction
                  label="Test"
                  disabled={status !== "ready" || Boolean(running)}
                  onClick={() => void run({ action: "test" })}
                />
                <button
                  type="button"
                  onClick={() => setOutput([])}
                  className="ml-auto rounded-md px-2 py-1 text-[10.5px] text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  Clear
                </button>
              </div>

              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-relaxed">
                {output.length ? output.join("\n") : "Browser Workspace console ready."}
              </pre>

              {terminalEnabled ? (
                <form
                  className="flex items-center gap-2 border-t border-white/10 p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const value = command.trim();
                    if (!value) return;
                    setCommand("");
                    void run({ command: value });
                  }}
                >
                  <span className="font-mono text-[11px] text-emerald-400">$</span>
                  <input
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="Run a safe command…"
                    className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-white outline-none placeholder:text-zinc-600"
                  />
                  <button
                    type="submit"
                    disabled={!command.trim() || Boolean(running)}
                    className="rounded-md bg-white/10 px-2.5 py-1.5 text-[10.5px] font-semibold text-white hover:bg-white/15 disabled:opacity-40"
                  >
                    Run
                  </button>
                </form>
              ) : (
                <div className="border-t border-white/10 px-3 py-2 text-[10.5px] text-zinc-500">
                  Safe Build, Typecheck and Lint actions are available. Custom terminal commands are disabled by deployment policy.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function QuickAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 text-[10.5px] font-semibold text-ink-3 transition hover:border-violet-400/25 hover:bg-violet-500/10 hover:text-ink disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

function ConsoleAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function formatBytes(value: number) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
