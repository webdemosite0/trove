"use client";

/**
 * Workspace setup checklist — P2 goal-gradient.
 *
 * Every item reflects an action the user has ACTUALLY completed; the meter
 * never starts at 0% because "Account created" is pre-credited (this page
 * only renders for signed-in users). Flags come from the server (real DB
 * counts), so there is no loading flash and no faked progress.
 *
 * Dismissible only once every milestone is complete; the dismissal is stored
 * per-user in localStorage.
 */

import { useState } from "react";
import Link from "next/link";
import {
  FiCheck,
  FiChevronRight,
  FiFileText,
  FiLayers,
  FiStar,
  FiX,
  TbMessageCircle,
  TbPlug,
  TbRobot,
  TbSparkles,
} from "@/components/ui/icons";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";

export type WorkspaceSetupFlags = {
  /** Pre-credited: true whenever the viewer is signed in. */
  account: boolean;
  chat: boolean;
  tro: boolean;
  artifact: boolean;
  integration: boolean;
};

type Item = {
  id: keyof WorkspaceSetupFlags;
  label: string;
  hint: string;
  Icon: typeof TbRobot;
  action: { type: "link"; href: string } | { type: "settings"; section: string } | null;
};

const ITEMS: Item[] = [
  {
    id: "account",
    label: "Account created",
    hint: "You're signed in — this one counts already",
    Icon: FiStar,
    action: null,
  },
  {
    id: "chat",
    label: "Send your first chat",
    hint: "Ask Trove anything to get going",
    Icon: TbMessageCircle,
    action: { type: "link", href: "/chat" },
  },
  {
    id: "tro",
    label: "Create your first Tro",
    hint: "Hire a specialist for multi-step work",
    Icon: TbRobot,
    action: { type: "link", href: "/tros/new" },
  },
  {
    id: "artifact",
    label: "Generate your first artifact",
    hint: "Documents, sheets, slides, sites",
    Icon: FiFileText,
    action: { type: "link", href: "/chat" },
  },
  {
    id: "integration",
    label: "Connect an integration",
    hint: "Plug in Gmail, Drive, GitHub and more",
    Icon: TbPlug,
    action: { type: "settings", section: "integrations" },
  },
];

function dismissKey(userId: string) {
  return `trove-workspace-setup-dismissed:${userId}`;
}

function ActionRow({ item }: { item: Item }) {
  const { openSettings } = useNav();
  const action = item.action;
  if (!action) return null;
  const label = `Go to ${item.label.toLowerCase()}`;
  const cls =
    "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-raised px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 transition hover:border-accent hover:text-accent";
  if (action.type === "link") {
    return (
      <Link href={action.href} aria-label={label} className={cls}>
        Go <FiChevronRight size={12} aria-hidden />
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => openSettings(action.section)}
      className={cls}
    >
      Go <FiChevronRight size={12} aria-hidden />
    </button>
  );
}

export function WorkspaceSetup({
  flags,
  userId,
}: {
  flags: WorkspaceSetupFlags;
  userId: string;
}) {
  const key = dismissKey(userId);
  // Read dismissal synchronously on first render so a dismissed card never
  // flashes in; suppressHydrationWarning absorbs the SSR/client difference.
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(key) === "1",
  );

  if (dismissed) return null;

  const doneCount = ITEMS.filter((i) => flags[i.id]).length;
  const total = ITEMS.length;
  const complete = doneCount === total;
  const strength = Math.round((doneCount / total) * 100);
  const next = ITEMS.find((i) => !flags[i.id]);

  if (complete) {
    return (
      <section
        suppressHydrationWarning
        aria-label="Workspace setup complete"
        className="mt-7 flex items-center gap-3 rounded-2xl border border-line bg-raised/80 px-4 py-3"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <TbSparkles size={17} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-medium text-ink-2">
          Your workspace is ready — every milestone is done.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(key, "1");
            } catch {
              /* storage unavailable — card simply stays */
            }
            setDismissed(true);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-raised px-3 py-1.5 text-[12px] font-medium text-ink-3 transition hover:border-line-strong hover:text-ink"
        >
          <FiX size={12} aria-hidden /> Dismiss
        </button>
      </section>
    );
  }

  return (
    <section
      suppressHydrationWarning
      aria-label="Workspace setup"
      className="mt-7 overflow-hidden rounded-2xl border border-line bg-raised/80"
    >
      <div className="border-b border-line/70 px-4 pb-3.5 pt-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
            Set up your workspace
          </h2>
          <p className="shrink-0 text-[11.5px] font-semibold text-ink-3">
            Workspace strength · {strength}%
          </p>
        </div>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sunk"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Workspace setup: ${doneCount} of ${total} milestones complete`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--btn-a)] to-[var(--btn-b)] transition-[width] duration-500"
            style={{ width: `${strength}%` }}
          />
        </div>
        {next && (
          <p className="mt-2 text-[12px] text-ink-4">
            Next: <span className="font-medium text-ink-3">{next.label}</span>
          </p>
        )}
      </div>

      <ul className="divide-y divide-line/60">
        {ITEMS.map((item) => {
          const done = flags[item.id];
          const Icon = item.Icon;
          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  done ? "bg-positive-soft text-positive" : "bg-sunk text-ink-3",
                )}
                aria-hidden
              >
                {done ? <FiCheck size={16} /> : <Icon size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[13.5px] font-medium",
                    done ? "text-ink-4 line-through decoration-line-strong" : "text-ink",
                  )}
                >
                  {item.label}
                </span>
                <span className="block truncate text-[11.5px] text-ink-4">{item.hint}</span>
              </span>
              {!done && item.action ? <ActionRow item={item} /> : null}
              {done && item.id !== "account" ? (
                <span className="shrink-0 text-[11px] font-medium text-positive">Done</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Pre-credit footnote: progress is real, never manufactured. */}
      <p className="flex items-center gap-1.5 border-t border-line/70 bg-sunk/40 px-4 py-2.5 text-[11px] text-ink-4 sm:px-5">
        <FiLayers size={11} aria-hidden />
        Your account already counts — everything else lights up as you do it.
      </p>
    </section>
  );
}
