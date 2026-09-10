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
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  async function deploy() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/github/deploy", {
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
        setAsk(false);
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Deploy failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {!ask ? (
        <button
          type="button"
          onClick={() => setAsk(true)}
          disabled={!files.length || busy}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
        >
          Deploy to GitHub
        </button>
      ) : (
        <ConnectorApproval
          name="GitHub"
          mark="GH"
          tone="#e6edf3"
          action={`Create a repository and upload ${files.length} files from this build.`}
          detail={title ? `Repo name will be based on “${title}”.` : undefined}
          busy={busy}
          onAllow={() => void deploy()}
          onDeny={() => setAsk(false)}
        />
      )}
      {result?.url ? (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[13px] text-accent hover:underline"
        >
          Open {result.url.replace("https://", "")}
        </a>
      ) : null}
      {result?.error ? (
        <p className="text-[12.5px] text-critical">{result.error}</p>
      ) : null}
    </div>
  );
}
