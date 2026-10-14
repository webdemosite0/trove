"use client";

import { FiArrowRight } from "@/components/ui/icons";
import { ServiceMark } from "@/components/integrations/service-mark";
import { useNav } from "@/components/shell/nav-state";

const PREVIEW_TOOLS = [
  { id: "gmail", name: "Gmail" },
  { id: "slack", name: "Slack" },
  { id: "github", name: "GitHub" },
];

export function ConnectToolsCard() {
  const { openSettings } = useNav();
  return (
    <button
      type="button"
      onClick={() => openSettings("integrations")}
      className="group mx-auto flex w-full max-w-[640px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-sunk"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 -space-x-1.5">
          {PREVIEW_TOOLS.map((tool, index) => (
            <span
              key={tool.id}
              className="grid size-8 place-items-center rounded-[var(--r-control)] border border-line bg-raised"
              style={{ zIndex: PREVIEW_TOOLS.length - index }}
            >
              <ServiceMark id={tool.id} name={tool.name} size={22} />
            </span>
          ))}
        </span>

        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium text-ink">Connect your tools</span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-4">
            Gmail, Slack, GitHub and more — use them directly in Trove chat.
          </span>
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1 text-[12.5px] font-medium text-ink-3 transition-colors group-hover:text-ink sm:inline-flex">
        Connect
        <FiArrowRight size={13} />
      </span>
    </button>
  );
}
