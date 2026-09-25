"use client";

import { useCallback, useEffect, useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/hooks/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import type { Recent } from "@/lib/recents";
import { ConnectToolsCard } from "@/components/chat/connect-tools-card";
import {
  ProjectPicker,
  type ChatProjectOption,
} from "@/components/chat/project-picker";
import { BrowserWorkspace } from "@/components/chat/browser-workspace";
import {
  writeLocalProjectFiles,
  type LocalProjectFile,
  type LocalProjectWorkspace,
} from "@/lib/local-project";

export function HomeChat({
  restored = null,
  name = "there",
  activity: initialActivity = [],
  draft: initialDraft = "",
  projects: initialProjects = [],
  initialProjectId = null,
}: {
  restored?: {
    id: string;
    title?: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
  projects?: ChatProjectOption[];
  initialProjectId?: string | null;
}) {
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [draft, setDraft] = useState(initialDraft);
  const [activity, setActivity] = useState<Recent[]>(initialActivity);
  const [projects, setProjects] = useState<ChatProjectOption[]>(initialProjects);
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId || null,
  );
  const [localProject, setLocalProject] =
    useState<LocalProjectWorkspace | null>(null);

  useEffect(() => {
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
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialActivity.length, initialProjects.length]);

  const applyLocalFiles = useCallback(
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

  const { turns, busy, error, send, retry, regenerate, clear, bottom } =
    useChatThread({
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
      <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
        <div className="relative z-[1] flex flex-1 flex-col items-center px-5 pb-14 pt-[6vh] lg:pt-[9vh]">
          <div className="w-full max-w-[720px] text-center">
            <div className="nx-rise">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-sky-500/10 px-3 py-1 text-[12px] font-medium text-violet-600 shadow-sm backdrop-blur-sm dark:text-violet-300">
                <span className="text-[13px]">✦</span>
                Powered by Trove AI
              </div>
              <Greeting name={name} />
              <h1 className="mt-2.5 text-[clamp(2.1rem,1.1rem+2.8vw,3.35rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
                What will you build today?
              </h1>
              <p className="mx-auto mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-ink-3">
                Describe an idea, automate a task, or create something new.
              </p>
            </div>

            <div
              className="nx-rise mt-8"
              style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
            >
              <Composer
                onSend={send}
                initialValue={draft}
                placeholder="Ask anything, or describe what to create…"
                autoFocus
                disabled={busy}
                {...composerProps}
              />
            </div>

            {projectId || localProject ? (
              <div className="mt-4 text-left">
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
              </div>
            ) : null}

            <StarterCards className="mt-6" onPick={setDraft} />
            <div className="mt-6">
              <ConnectToolsCard />
            </div>

            {error ? <ErrorNote message={error} onRetry={retry} /> : null}

            {activity.length ? (
              <div
                className="nx-rise mt-10 text-left"
                style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
              >
                <ContinuePanel items={activity} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="z-20 shrink-0 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex h-14 max-w-[760px] items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[14px] text-ink">{turns[0]?.text.slice(0, 64)}</p>
          {projectControl}
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-5 [scrollbar-gutter:stable] lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-5">
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
          {turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              files={t.files}
              generatingImage={t.generatingImage}
              imageCaption={t.imageCaption}
              pending={busy && i === turns.length - 1 && t.role === "model"}
              onRegenerate={
                !busy && i === turns.length - 1 && t.role === "model"
                  ? regenerate
                  : undefined
              }
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={retry} /> : null}
          <div ref={bottom} className="h-px w-full shrink-0" aria-hidden />
        </div>
      </div>

      <div className="shrink-0 border-t border-line/60 bg-canvas px-5 pb-5 pt-3 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <Composer onSend={send} placeholder="Reply…" disabled={busy} {...composerProps} />
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-5" />;
}
