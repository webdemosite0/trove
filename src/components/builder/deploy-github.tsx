"use client";

import { useState } from "react";
import { ConnectorApproval } from "@/components/integrations/connector-menu";
import type { ProjectFile } from "@/lib/builder";

export function DeployGithubButton({
  files,
  title,
}: {
  files: ProjectFile[];
  title?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "ask-gh" | "ask-vercel" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function deployGithub() {
    setPhase("busy");
    setError(null);
    try {
      const res = await fetch("/api/github/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setResultUrl(data.url ?? data.html_url ?? null);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setPhase("idle");
    }
  }

  async function deployVercel() {
    setPhase("busy");
    setError(null);
    try {
      const res = await fetch("/api/vercel/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setResultUrl(data.url ?? null);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!files.length || phase === "busy"}
        onClick={() => setPhase("ask-gh")}
        className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40"
      >
        Deploy to GitHub
      </button>
      <button
        type="button"
        disabled={!files.length || phase === "busy"}
        onClick={() => setPhase("ask-vercel")}
        className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40"
      >
        Deploy to Vercel
      </button>
      {resultUrl ? (
        <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-accent hover:underline">
          Open deployment
        </a>
      ) : null}
      {error ? <p className="w-full text-[12.5px] text-critical">{error}</p> : null}

      {phase === "ask-gh" ? (
        <div className="w-full">
          <ConnectorApproval
            name="GitHub"
            serviceId="github"
            action="Create a repository and upload the built site files."
            onAllow={() => void deployGithub()}
            onDeny={() => setPhase("idle")}
            busy={false}
          />
        </div>
      ) : null}
      {phase === "ask-vercel" ? (
        <div className="w-full">
          <ConnectorApproval
            name="Vercel"
            serviceId="vercel"
            action="Deploy this project to a Vercel preview URL."
            onAllow={() => void deployVercel()}
            onDeny={() => setPhase("idle")}
            busy={false}
          />
        </div>
      ) : null}
    </div>
  );
}
