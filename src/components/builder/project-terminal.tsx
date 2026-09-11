"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "@/lib/builder";
import { cn } from "@/lib/utils";

/**
 * Lightweight project shell — runs against the generated file tree in-browser.
 * Not a remote Node sandbox: no npm install, no real localhost server.
 * Useful commands: help, ls, cat, tree, download, preview, clear.
 */
export function ProjectTerminal({
  files,
  onPreview,
  onDownload,
  className,
}: {
  files: ProjectFile[];
  onPreview?: () => void;
  onDownload?: () => void;
  className?: string;
}) {
  const [lines, setLines] = useState<string[]>([
    "Trove project shell — type help",
  ]);
  const [cmd, setCmd] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  function print(...extra: string[]) {
    setLines((L) => [...L, ...extra]);
  }

  function run(raw: string) {
    const text = raw.trim();
    if (!text) return;
    print(`$ ${text}`);
    const [name, ...args] = text.split(/\s+/);
    const a0 = args[0] ?? "";

    switch (name.toLowerCase()) {
      case "help":
        print(
          "help                 this list",
          "ls                   list project files",
          "tree                 file tree",
          "cat <path>           show file contents",
          "wc <path>            byte size",
          "preview              open live preview",
          "download | zip       download project zip",
          "clear                clear screen",
          "",
          "Note: this is an in-browser project shell, not a remote Node host.",
          "npm / node / localhost need a secure sandbox (not available here).",
        );
        break;
      case "ls":
      case "dir": {
        if (!files.length) print("(empty project)");
        else files.forEach((f) => print(`  ${f.path.padEnd(36)} ${f.content.length} B`));
        break;
      }
      case "tree": {
        if (!files.length) print("(empty)");
        else files.forEach((f) => print(`├── ${f.path}`));
        break;
      }
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
        else {
          const linesN = f.content.split("\n").length;
          print(`${linesN} lines  ${f.content.length} bytes  ${f.path}`);
        }
        break;
      }
      case "preview":
      case "open":
        if (onPreview) {
          onPreview();
          print("Opening preview…");
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
      case "npm":
      case "node":
      case "npx":
      case "yarn":
      case "pnpm":
        print(
          `${name}: not available in the browser shell.`,
          "Static HTML/CSS/JS sites run in Preview. For real Node, download the zip and run locally.",
        );
        break;
      default:
        print(`${name}: command not found. Type help.`);
    }
  }

  return (
    <div
      className={cn("flex min-h-0 flex-col bg-[#0c0c0e] font-mono text-[12px] text-[#c8c8d0]", className)}
      onClick={() => input.current?.focus()}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px] text-white/40">
        <span className="text-positive">●</span> project shell
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
          run(cmd);
          setCmd("");
        }}
      >
        <span className="text-accent">$</span>
        <input
          ref={input}
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[#e8e8ef] outline-none placeholder:text-white/25"
          placeholder="help · ls · cat index.html · preview · download"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
