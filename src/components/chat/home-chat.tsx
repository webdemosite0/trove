"use client";

import { useCallback, useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/lib/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import type { Recent } from "@/lib/recents";
import {
  ProjectPicker,
  type ChatProjectOption,
} from "@/components/chat/project-picker";
import {
  writeLocalProjectFiles,
  type LocalProjectFile,
  type LocalProjectWorkspace,
} from "@/lib/local-project";

export function HomeChat({
  restored = null,
  name = "there",
  activity = [],
  draft: initialDraft = "",
  projects: initialProjects = [],
  initialProjectId = null,
}: {
  restored?: { id: string; title: string; messages: { role: "user" | "model"; text: string }[] } | null;
  name?: string;
  activity?: Recent[];
  draft?: string;
  projects?: ChatProjectOption[];
  initialProjectId?: string | null;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [projects, setProjects] = useState<ChatProjectOption[]>(initialProjects);
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId && initialProjects.some((project) => project.id === initialProjectId)
      ? initialProjectId
      : null,
  );
  const [localProject, setLocalProject] = useState<LocalProjectWorkspace | null>(null);

  const applyLocalFiles = useCallback(
    async (changes: LocalProjectFile[]) => {
      if (!localProject) return;
      await writeLocalProjectFiles(localProject.handle, changes);
      setLocalProject((current) => {
        if (!current) return current;
        const merged = new Map(current.files.map((file) => [file.path, file]));
        for (const file of changes) merged.set(file.path, file);
        return { ...current, files: [...merged.values()] };
      });
    },
    [localProject],
  );

  const { turns, busy, error, send, retry, regenerate, clear, bottom } = useChatThread({
    restored,
    mode,
    projectId,
    localProject: localProject
      ? { name: localProject.name, files: localProject.files }
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
        setProjects((items) => [project, ...items.filter((item) => item.id !== project.id)]);
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

  const composerProps = {
    mode,
    onModeChange: setMode,
    leading: projectControl,
  };

  if (turns.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
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
              className="nx-rise mt-7 text-left"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              <Composer
                key={draft}
                initialValue={draft}
                onSend={send}
                {...composerProps}
                autoFocus
                disabled={busy}
              />
            </div>

            <StarterCards className="mt-6" onPick={setDraft} />

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
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="shrink-0 z-20 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3">
          <span className="truncate text-[14px] text-ink">
            {turns[0]?.text.slice(0, 64)}
          </span>
          <button
            onClick={clear}
            className="shrink-0 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-7 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-7">
          {turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              files={t.files}
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
          <Composer
            onSend={send}
            placeholder="Reply…"
            disabled={busy}
            {...composerProps}
          />
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
