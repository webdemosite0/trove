"use client";

import Link from "next/link";
import { FiArrowRight, FiLink } from "@/components/ui/icons";
import { ServiceMark } from "@/components/integrations/service-mark";

const PREVIEW_TOOLS = [
  { id: "gmail", name: "Gmail" },
  { id: "slack", name: "Slack" },
  { id: "github", name: "GitHub" },
];

export function ConnectToolsCard() {
  return (
    <Link
      href="/integrations"
      className="group mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 rounded-[22px] border border-violet-300/35 bg-gradient-to-r from-violet-500/[0.09] via-fuchsia-500/[0.07] to-sky-500/[0.09] px-4 py-3.5 text-left shadow-[0_14px_40px_-30px_var(--btn-glow)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-violet-400/45 hover:shadow-[0_18px_46px_-28px_var(--btn-glow)] dark:border-violet-400/20"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 -space-x-2">
          {PREVIEW_TOOLS.map((tool, index) => (
            <span
              key={tool.id}
              className="grid size-11 place-items-center rounded-[14px] border-2 border-raised bg-raised shadow-[var(--sh-1)]"
              style={{ zIndex: PREVIEW_TOOLS.length - index }}
            >
              <ServiceMark id={tool.id} name={tool.name} size={36} />
            </span>
          ))}
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
            <FiLink size={14} className="text-violet-500 dark:text-violet-300" />
            Connect your tools
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-4">
            Gmail, Slack, GitHub and more — use them directly in Trove chat.
          </span>
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-raised/85 px-3 py-2 text-[11.5px] font-semibold text-accent shadow-[var(--sh-1)] transition group-hover:border-accent/35 group-hover:bg-accent-soft sm:inline-flex">
        Connect all tools
        <FiArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
