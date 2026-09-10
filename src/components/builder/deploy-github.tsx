"use client";

import { useState } from "react";
import { ConnectorApproval } from "@/components/integrations/connector-menu";

export function DeployGithubButton({
  files,
  title,
}: {
  files: { path: string; content: string }[];
  title?: string;
}) {
  const [ask, setAsk] = useState<null | "github" | "vercel">(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  async function deploy(kind: "github" | "vercel") {
    setBusy(true);
    setResult(null);
    try {
      const endpoint = kind === "github" ? "/api/github/deploy" : "/api/vercel/deploy";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title || "trove-site",
          description: "Built with Trove",
          files,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResult({ error: data?.error ?? `Deploy failed (${res.status})` });
      } else {
        setResult({ url: data.url });
        setAsk(null);
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Deploy failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {ask === null ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAsk("github")}
            disabled={!files.length || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            Deploy to GitHub
          </button>
          <button
            type="button"
            onClick={() => setAsk("vercel")}
            disabled={!files.length || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            Deploy to Vercel
          </button>
        </div>
      ) : ask === "github" ? (
        <ConnectorApproval
          name="GitHub"
          mark="GH"
          tone="#e6edf3"
          action={`Create a repository and upload ${files.length} files from this build.`}
          detail={title ? `Repo name will be based on “${title}”.` : undefined}
          busy={busy}
          onAllow={() => void deploy("github")}
          onDeny={() => setAsk(null)}
        />
      ) : (
        <ConnectorApproval
          name="Vercel"
          mark="▲"
          tone="#ffffff"
          action={`Create a Vercel deployment with ${files.length} files.`}
          detail="Uses your connected Vercel access token."
          busy={busy}
          onAllow={() => void deploy("vercel")}
          onDeny={() => setAsk(null)}
        />
      )}
      {result?.url ? (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[13px] text-accent hover:underline"
        >
          Open {result.url.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
      {result?.error ? (
        <p className="text-[12.5px] text-critical">{result.error}</p>
      ) : null}
    </div>
  );
}
