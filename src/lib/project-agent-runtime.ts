"use client";

import type { LocalProjectFile } from "@/lib/local-project";

export type ProjectVerificationStep = {
  action: "typecheck" | "lint" | "test" | "build";
  ok: boolean;
  skipped?: boolean;
  output: string;
};

export type ProjectVerification = {
  available: boolean;
  ok: boolean;
  previewUrl: string;
  steps: ProjectVerificationStep[];
  diagnostics: string;
};

type Target =
  | { projectId: string; localScope?: never; files?: never }
  | { projectId?: never; localScope: string; files: LocalProjectFile[] };

async function json(res: Response) {
  return res.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

export async function verifyProjectWorkspace(
  target: Target,
): Promise<ProjectVerification> {
  const sync = await fetch("/api/browser-workspace/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
  const syncData = await json(sync);

  if (!sync.ok) {
    const error = String(syncData?.error || "Browser Workspace is unavailable.");
    return {
      available: false,
      ok: false,
      previewUrl: "",
      steps: [],
      diagnostics: error,
    };
  }

  const previewUrl = String(syncData?.url || "");
  const steps: ProjectVerificationStep[] = [];
  const actions = ["typecheck", "lint", "test", "build"] as const;

  for (const action of actions) {
    const res = await fetch("/api/browser-workspace/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, files: undefined, action }),
    });
    const data = await json(res);
    const stdout = String(data?.stdout || "");
    const stderr = String(data?.stderr || "");
    const output = [stdout, stderr].filter(Boolean).join("\n").slice(-16_000);

    if (!res.ok) {
      steps.push({ action, ok: false, output: String(data?.error || output || action + " failed") });
      break;
    }

    const exitCode = Number(data?.exitCode ?? 0);
    const skipped = Boolean(data?.skipped);
    steps.push({
      action,
      ok: exitCode === 0,
      skipped,
      output,
    });

    if (exitCode !== 0) break;
  }

  const failed = steps.find((step) => !step.ok);
  const diagnostics = failed
    ? [
        failed.action + " failed.",
        failed.output || "No diagnostic output was returned.",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(-18_000)
    : "";

  return {
    available: true,
    ok: !failed,
    previewUrl,
    steps,
    diagnostics,
  };
}

export function verificationSummary(result: ProjectVerification) {
  if (!result.available) {
    return (
      "Verification skipped because the isolated Browser Workspace is unavailable." +
      (result.diagnostics ? "\n" + result.diagnostics : "")
    );
  }
  if (result.ok) {
    const ran = result.steps
      .filter((step) => !step.skipped)
      .map((step) => step.action);
    return (
      "Verified in Browser Workspace" +
      (ran.length ? ": " + ran.join(", ") + " passed." : ".") +
      (result.previewUrl ? "\nPreview: " + result.previewUrl : "")
    );
  }
  return "Verification found an error:\n" + result.diagnostics;
}
