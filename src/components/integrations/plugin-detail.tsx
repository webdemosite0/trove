"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheck } from "@/components/ui/icons";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { ServiceMark } from "@/components/integrations/service-mark";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";

const EXAMPLES: Record<string, { prompt: string; reply: string }> = {
  gmail: {
    prompt:
      "Summarize the last 5 messages in Q3 launch plan and capture decisions, open questions, and what I should follow up on next",
    reply:
      "Here's the recap of the last 5 messages in Q3 launch plan. The team agreed on a phased launch; final testing and customer communications still need confirmation.\n\nDecisions\n• Start with a small group of existing customers, then expand after a one-week pilot.\n• Keep the new onboarding flow in scope; move advanced reporting to a later release.",
  },
  github: {
    prompt: "List open PRs that need my review and summarize the riskiest changes",
    reply:
      "You have 3 open PRs waiting on you.\n\n• feat/auth-refresh — touches session cookies; review carefully before merge.\n• fix/billing-webhook — small, low risk.\n• chore/deps — dependency bumps only.",
  },
  slack: {
    prompt: "What did the design channel decide about the new nav?",
    reply:
      "In #design, the team picked a left rail with icons + labels, and deferred the command palette to next sprint.",
  },
  notion: {
    prompt: "Pull action items from the Product Spec page",
    reply:
      "From Product Spec:\n• Ship mobile preview by Friday\n• Finalize pricing copy\n• Schedule customer interviews",
  },
  "google-calendar": {
    prompt: "What's free on my calendar tomorrow afternoon?",
    reply: "Tomorrow you're free 1:30–3:00pm and after 4:15pm. Want me to hold a slot?",
  },
  "google-drive": {
    prompt: "Find the latest brand guidelines PDF",
    reply: "Found Brand_Guidelines_v4.pdf in Marketing/Assets, updated 3 days ago.",
  },
};

function exampleFor(id: string) {
  return (
    EXAMPLES[id] ?? {
      prompt: `Help me work with ${id} using Trove`,
      reply:
        "Once connected, ask Trove to read, summarize, and take action across this tool — right from chat.",
    }
  );
}

export function PluginDetailView({
  service,
  connected,
  connectable,
  signedIn,
  nangoOn,
  nangoService,
}: {
  service: Service;
  connected: boolean;
  connectable?: { label: string; help: string; docs?: string };
  signedIn: boolean;
  nangoOn: boolean;
  nangoService: boolean;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const demo = exampleFor(service.id);

  async function connectNango() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/nango/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      const link = data.connectLink as string;
      const popup = window.open(link, "nango-connect", "width=520,height=720");
      if (!popup) throw new Error("Popup blocked");
      const started = Date.now();
      await new Promise<void>((resolve) => {
        const t = setInterval(() => {
          if (popup.closed || Date.now() - started > 5 * 60_000) {
            clearInterval(t);
            resolve();
          }
        }, 800);
      });
      await fetch("/api/nango/sync", { method: "POST" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  function install() {
    if (connected) return;
    if (nangoOn && nangoService) {
      void connectNango();
      return;
    }
    if (connectable) setOpening(true);
  }

  function uninstall() {
    startTransition(async () => {
      await disconnect(service.id);
      router.refresh();
    });
  }

  const canInstall = Boolean(connectable) || (nangoOn && nangoService);

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-transparent text-ink">
      <div className="mx-auto max-w-[720px] px-5 pb-20 pt-6 sm:px-8">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-[14px] text-ink-3 transition hover:text-ink"
        >
          <FiArrowLeft size={16} />
          Plugins
        </Link>

        <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid size-[72px] place-items-center rounded-[22px] bg-raised shadow-[var(--elev)] ring-1 ring-line">
              <ServiceMark id={service.id} name={service.name} size={44} />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink">
                {service.name}
              </h1>
              <p className="mt-1 text-[14.5px] text-ink-3">{service.blurb}</p>
            </div>
          </div>

          {connected ? (
            <button
              type="button"
              disabled={pending}
              onClick={uninstall}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-positive/30 bg-positive-soft px-5 text-[14px] font-semibold text-positive"
            >
              <FiCheck size={16} />
              Installed
            </button>
          ) : (
            <button
              type="button"
              disabled={!signedIn || !canInstall || busy}
              onClick={install}
              className={cn(
                "h-11 rounded-full px-6 text-[14px] font-semibold transition",
                canInstall
                  ? "btn-grad text-white disabled:opacity-50"
                  : "border border-line text-ink-4",
              )}
            >
              {busy ? "Connecting…" : canInstall ? "Install plugin" : "Coming soon"}
            </button>
          )}
        </div>

        {error ? <p className="mt-4 text-[13px] text-critical">{error}</p> : null}

        <div className="relative mt-12 overflow-hidden rounded-[28px] border border-line shadow-[var(--elev)]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, #7dd3fc 0%, #93c5fd 35%, #c4b5fd 70%, #f0abfc 100%)",
            }}
          />
          <div className="relative space-y-4 p-5 sm:p-8">
            <div className="ml-auto max-w-[92%] rounded-2xl bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800 shadow-sm">
              {demo.prompt}
            </div>
            <div className="max-w-[95%] rounded-2xl bg-white/95 px-4 py-4 text-[14px] leading-relaxed text-slate-700 shadow-sm">
              <p className="mb-2 text-[12px] text-slate-400">Worked for 12 seconds</p>
              {demo.reply.split("\n").map((line, i) =>
                line.startsWith("•") ? (
                  <p key={i} className="ml-1 text-slate-700">
                    {line}
                  </p>
                ) : line === "Decisions" ? (
                  <p key={i} className="mt-3 font-semibold text-slate-900">
                    {line}
                  </p>
                ) : (
                  <p key={i} className={i > 0 ? "mt-2" : undefined}>
                    {line}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-ink-4">
          {service.category} · Connect once, use in chat
        </p>
      </div>

      {opening && connectable ? (
        <ConnectDialog
          service={service.id}
          name={service.name}
          label={connectable.label}
          help={connectable.help}
          docs={connectable.docs}
          onClose={() => setOpening(false)}
        />
      ) : null}
    </div>
  );
}
