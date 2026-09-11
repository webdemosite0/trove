"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "@/lib/builder";
import { cn } from "@/lib/utils";

/**
 * Project shell: local file commands always work.
 * With E2B_API_KEY on the server, `sandbox` boots a cloud VM for real npm/node.
 */
export function ProjectTerminal({
  files,
  onPreview,
  onDownload,
  onPreviewUrl,
  className,
}: {
  files: ProjectFile[];
  onPreview?: () => void;
  onDownload?: () => void;
  onPreviewUrl?: (url: string) => void;
  className?: string;
}) {
  const [lines, setLines] = useState<string[]>([
    "Trove project shell — type help",
  ]);
  const [cmd, setCmd] = useState("");
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  function print(...extra: string[]) {
    setLines((L) => [...L, ...extra]);
  }

  async function bootSandbox() {
    if (!files.length) {
      print("sandbox: no project files yet — build a site first");
      return;
    }
    setBusy(true);
    print("sandbox: creating cloud VM and uploading files…");
    try {
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, serve: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        print(`sandbox: ${data?.error ?? `failed (${res.status})`}`);
        if (data?.needKey) {
          print("  → Add E2B_API_KEY on the server: https://e2b.dev/dashboard");
        }
        return;
      }
      setSandboxId(data.sandboxId);
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        onPreviewUrl?.(data.previewUrl);
        print(`sandbox: ready  ${data.sandboxId}`);
        print(`preview: ${data.previewUrl}`);
      } else {
        print(`sandbox: ready  ${data.sandboxId}`);
      }
      print("  remote commands (npm, node, …) now run in the VM");
    } catch (e) {
      print(`sandbox: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function remoteExec(command: string, background = false) {
    if (!sandboxId) {
      print("no sandbox — run: sandbox");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId, command, background }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        print(data?.error ?? `exec failed (${res.status})`);
        return;
      }
      if (data.stdout) print(...String(data.stdout).split("\n").slice(0, 200));
      if (data.stderr)
        print(
          ...String(data.stderr)
            .split("\n")
            .slice(0, 80)
            .map((l: string) => `! ${l}`),
        );
      if (!background && data.exitCode !== 0) {
        print(`[exit ${data.exitCode}]`);
      }
    } catch (e) {
      print(e instanceof Error ? e.message : "exec failed");
    } finally {
      setBusy(false);
    }
  }

  async function killSandbox() {
    if (!sandboxId) {
      print("no sandbox");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/sandbox/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
      print("sandbox: stopped");
      setSandboxId(null);
      setPreviewUrl(null);
    } catch (e) {
      print(e instanceof Error ? e.message : "kill failed");
    } finally {
      setBusy(false);
    }
  }

  async function run(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    print(`$ ${text}`);
    const [name, ...args] = text.split(/\s+/);
    const a0 = args[0] ?? "";
    const rest = args.join(" ");

    switch (name.toLowerCase()) {
      case "help":
        print(
          "Local (always):",
          "  help · ls · tree · cat <path> · wc <path>",
          "  preview · download · clear",
          "",
          "Cloud sandbox (needs E2B_API_KEY on server):",
          "  sandbox          start VM + upload project + HTTP server",
          "  kill             stop sandbox",
          "  url              show live preview URL",
          "  run <cmd>        run any command in the VM (cwd=project)",
          "  npm <args>       shorthand for run npm …",
          "  node <args>      shorthand for run node …",
        );
        break;
      case "ls":
      case "dir":
        if (!files.length) print("(empty project)");
        else files.forEach((f) => print(`  ${f.path.padEnd(36)} ${f.content.length} B`));
        break;
      case "tree":
        if (!files.length) print("(empty)");
        else files.forEach((f) => print(`├── ${f.path}`));
        break;
      case "cat":
      case "type": {
        const f = files.find((x) => x.path === a0 || x.path.endsWith("/" + a0));
        if (!f) print(`cat: ${a0 || "(path)"}: no such file`);
        else print(...f.content.split("\n").slice(0, 200));
        break;
      }
      case "wc": {
        const f = files.find((x) => x.path === a0 || x.path.endsWith("/" + a0));
        if (!f) print(`wc: ${a0}: no such file`);
        else
          print(
            `${f.content.split("\n").length} lines  ${f.content.length} bytes  ${f.path}`,
          );
        break;
      }
      case "preview":
      case "open":
        if (previewUrl) {
          window.open(previewUrl, "_blank", "noopener");
          print(previewUrl);
        } else if (onPreview) {
          onPreview();
          print("Opening local blob preview…");
        } else print("preview: not available");
        break;
      case "download":
      case "zip":
        if (onDownload) {
          onDownload();
          print("Downloading zip…");
        } else print("download: not available");
        break;
      case "clear":
      case "cls":
        setLines([]);
        break;
      case "sandbox":
      case "boot":
        await bootSandbox();
        break;
      case "kill":
      case "stop":
        await killSandbox();
        break;
      case "url":
        print(previewUrl ?? "no live URL — run: sandbox");
        break;
      case "run":
        if (!rest) print("usage: run <command>");
        else await remoteExec(rest);
        break;
      case "npm":
      case "npx":
      case "node":
      case "yarn":
      case "pnpm":
        if (sandboxId) await remoteExec(`${name} ${rest}`.trim());
        else {
          print(`${name}: needs a cloud sandbox.`);
          print("  1) Set E2B_API_KEY on the server");
          print("  2) Type: sandbox");
          print("  3) Then: npm install   /  node app.js");
        }
        break;
      default:
        if (sandboxId) await remoteExec(text);
        else print(`${name}: command not found. Type help.`);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-[#0c0c0e] font-mono text-[12px] text-[#c8c8d0]",
        className,
      )}
      onClick={() => input.current?.focus()}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px] text-white/40">
        <span className={sandboxId ? "text-positive" : "text-white/30"}>●</span>
        {sandboxId ? `sandbox ${sandboxId.slice(0, 12)}…` : "project shell"}
        <span className="flex-1" />
        <span className="tabular-nums">{files.length} files</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            {l}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-white/10 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(cmd);
          setCmd("");
        }}
      >
        <span className="text-accent">$</span>
        <input
          ref={input}
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[#e8e8ef] outline-none placeholder:text-white/25 disabled:opacity-50"
          placeholder={
            sandboxId ? "npm install · node · ls · help" : "help · sandbox · ls · cat index.html"
          }
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
