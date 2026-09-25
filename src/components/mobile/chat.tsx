"use client";

import * as React from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiFolder,
  TbFileText,
  TbPalette,
  TbSearch,
  TbSparkles,
} from "@/components/ui/icons";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/hooks/use-chat-thread";
import type { Recent } from "@/lib/recents";
import { FailureNote } from "@/components/ui/failure-note";
import { BrowserWorkspace } from "@/components/chat/browser-workspace";
import {
  ProjectPicker,
  type ChatProjectOption,
} from "@/components/chat/project-picker";
import {
  writeLocalProjectFiles,
  type LocalProjectFile,
  type LocalProjectWorkspace,
} from "@/lib/local-project";
import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

const PROMPTS = [
  { label: "Build", prompt: "Build a polished landing page for ", icon: TbPalette, tone: "violet" },
  { label: "Write", prompt: "Write a clear professional ", icon: TbFileText, tone: "sky" },
  { label: "Research", prompt: "Research and summarize ", icon: TbSearch, tone: "emerald" },
] as const;

export function MobileChat({
  restored = null,
  name = "there",
  activity: initialActivity = [],
  draft: initialDraft = "",
  projects: initialProjects = [],
  initialProjectId = null,
}: {
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
  projects?: ChatProjectOption[];
  initialProjectId?: string | null;
}) {
  const [mode, setMode] = React.useState<ModeId>(DEFAULT_MODE);
  const [draft, setDraft] = React.useState(initialDraft);
  const [activity, setActivity] = React.useState<Recent[]>(initialActivity);
  const [projects, setProjects] = React.useState<ChatProjectOption[]>(initialProjects);
  const [projectId, setProjectId] = React.useState<string | null>(
    initialProjectId || null,
  );
  const [localProject, setLocalProject] =
    React.useState<LocalProjectWorkspace | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!initialActivity.length) {
        void fetch("/api/shell-meta?only=recents", {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (res) =>
            res.ok ? ((await res.json()) as { recents?: Recent[] }) : null,
          )
          .then((data) => {
            if (data?.recents) setActivity(data.recents);
          })
          .catch(() => null);
      }

      if (!initialProjects.length) {
        void fetch("/api/projects", {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (res) =>
            res.ok
              ? ((await res.json()) as { projects?: ChatProjectOption[] })
              : null,
          )
          .then((data) => {
            if (data?.projects) setProjects(data.projects);
          })
          .catch(() => null);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialActivity.length, initialProjects.length]);

  const applyLocalFiles = React.useCallback(
    async (changes: LocalProjectFile[]) => {
      if (!localProject) return;
      await writeLocalProjectFiles(
        localProject.handle,
        changes,
        localProject.scope,
      );
      setLocalProject((current) => {
        if (!current) return current;
        const merged = new Map(current.files.map((file) => [file.path, file]));
        for (const file of changes) merged.set(file.path, file);
        return { ...current, files: [...merged.values()] };
      });
    },
    [localProject],
  );

  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({
    restored,
    mode,
    projectId,
    localProject: localProject
      ? {
          name: localProject.name,
          scope: localProject.scope,
          files: localProject.files,
        }
      : null,
    onApplyLocalFiles: applyLocalFiles,
  });

  const projectControl = (
    <ProjectPicker
      projects={projects}
      value={projectId}
      onChange={(id) => {
        setProjectId(id);
        if (id) setLocalProject(null);
      }}
      onCreated={(project) => {
        setLocalProject(null);
        setProjects((items) => [
          project,
          ...items.filter((item) => item.id !== project.id),
        ]);
      }}
      localName={localProject?.name || ""}
      onLocalFolder={(workspace) => {
        setProjectId(null);
        setLocalProject(workspace);
      }}
      onClearLocal={() => setLocalProject(null)}
      disabled={busy}
      compact
    />
  );

  const activeProjectName =
    localProject?.name ||
    projects.find((project) => project.id === projectId)?.name ||
    null;

  const composerProps = {
    mode,
    onModeChange: setMode,
    leading: projectControl,
  };

  if (turns.length === 0) {
    return (
      <div className="mobile-chat flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-6 pt-[clamp(28px,7vh,64px)]">
          <div className="nx-rise flex flex-col items-center text-center">
            <div className="relative grid size-14 place-items-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 blur-xl"
              />
              <span className="relative grid size-12 place-items-center rounded-[18px] border border-line-strong bg-raised/90 shadow-[var(--sh-2)]">
                <TroveOrb size={29} />
              </span>
            </div>
            <h1 className="mt-5 text-[27px] font-semibold tracking-[-0.04em] text-ink">
              What can I help with?
            </h1>
            <p className="mt-2 max-w-[32ch] text-[13px] leading-relaxed text-ink-4">
              Hi {name}. Ask anything, connect an app with @, or work inside a project.
            </p>
          </div>

          <div className="nx-rise mt-7" style={{ animationDelay: "55ms" }}>
            <MobileComposer
              onSend={send}
              disabled={busy}
              {...composerProps}
              key={draft}
              initialValue={draft}
              placeholder="Message Trove…"
              autoFocus={false}
            />
          </div>

          {projectId || localProject ? (
            <div className="mt-4">
              <BrowserWorkspace
                projectId={projectId}
                projectName={activeProjectName}
                localProject={
                  localProject
                    ? {
                        name: localProject.name,
                        scope: localProject.scope,
                        files: localProject.files,
                      }
                    : null
                }
                compact
              />
            </div>
          ) : null}

          {error ? <Problem message={error} onRetry={retry} /> : null}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setDraft(item.prompt)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-raised/75 px-3.5 text-[12px] font-medium text-ink-2 shadow-[var(--sh-1)] transition active:scale-95",
                  item.tone === "violet" && "active:bg-violet-500/10",
                  item.tone === "sky" && "active:bg-sky-500/10",
                  item.tone === "emerald" && "active:bg-emerald-500/10",
                )}
              >
                <item.icon size={14} className="text-accent" />
                {item.label}
              </button>
            ))}
          </div>

          {activity.length ? (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-4">
                  Recent
                </h2>
                <Link
                  href="/projects"
                  className="text-[11px] font-medium text-accent"
                >
                  View work
                </Link>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-line bg-raised/70 shadow-[var(--sh-1)]">
                {activity.slice(0, 5).map((recent, index) => (
                  <Link
                    key={`${recent.kind}-${recent.href}-${recent.title}`}
                    href={recent.href}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition active:bg-hover",
                      index > 0 && "border-t border-line/70",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/10 to-sky-500/10 text-accent">
                      {recent.kind === "site" ? (
                        <FiFolder size={14} />
                      ) : (
                        <TbSparkles size={14} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-2">
                      {recent.title}
                    </span>
                    <FiArrowRight size={13} className="shrink-0 text-ink-4" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-chat flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-line/45 px-3 py-2">
        <div className="min-w-0 flex-1">{projectControl}</div>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded-full px-3 py-2 text-[11.5px] font-medium text-ink-3 transition active:bg-hover active:text-ink"
        >
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4">
        <div className="mx-auto max-w-[640px] space-y-5">
          {projectId || localProject ? (
            <BrowserWorkspace
              projectId={projectId}
              projectName={activeProjectName}
              localProject={
                localProject
                  ? {
                      name: localProject.name,
                      scope: localProject.scope,
                      files: localProject.files,
                      native: localProject.native,
                    }
                  : null
              }
              compact
            />
          ) : null}
          {turns.map((turn, index) => (
            <Message
              key={turn.id}
              role={turn.role}
              text={turn.text}
              files={turn.files}
              pending={busy && index === turns.length - 1 && turn.role === "model"}
            />
          ))}
          {error ? <Problem message={error} onRetry={retry} /> : null}
          <div ref={bottom} className="h-px" aria-hidden />
        </div>
      </div>

      <div
        className="mobile-composer-dock shrink-0 border-t border-line/55 bg-canvas/88 px-3 pt-2 backdrop-blur-2xl"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-[640px]">
          <MobileComposer
            onSend={send}
            disabled={busy}
            placeholder="Message Trove…"
            {...composerProps}
          />
        </div>
      </div>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-4" compact />;
}
