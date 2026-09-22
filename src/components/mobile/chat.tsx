"use client";

import * as React from "react";
import Link from "next/link";
import type { IconType } from "@/components/ui/icons";
import { TbRobot, TbFileText, TbTable, TbPresentation, TbPalette, TbCode, TbSearch } from "@/components/ui/icons";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { Wordmark } from "@/components/brand/logo";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/hooks/use-chat-thread";
import type { Recent } from "@/lib/recents";
import { FailureNote } from "@/components/ui/failure-note";
import { StarterCards } from "@/components/home/starter-cards";
import {
  ProjectPicker,
  type ChatProjectOption,
} from "@/components/chat/project-picker";
import {
  writeLocalProjectFiles,
  type LocalProjectFile,
  type LocalProjectWorkspace,
} from "@/lib/local-project";
import { BrowserWorkspace } from "@/components/chat/browser-workspace";

const TOOLS: { href: string; label: string; icon: IconType }[] = [
  { href: "/agents", label: "Agents", icon: TbRobot },
  { href: "/documents", label: "Docs", icon: TbFileText },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable },
  { href: "/slides", label: "Slides", icon: TbPresentation },
  { href: "/code", label: "Code", icon: TbCode },
  { href: "/design", label: "Design", icon: TbPalette },
  { href: "/research", label: "Research", icon: TbSearch },
];

export function MobileChat({
  restored = null,
  name = "there",
  activity = [],
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
  const [projects, setProjects] = React.useState<ChatProjectOption[]>(initialProjects);
  const [projectId, setProjectId] = React.useState<string | null>(
    initialProjectId && initialProjects.some((project) => project.id === initialProjectId)
      ? initialProjectId
      : null,
  );
  const [localProject, setLocalProject] = React.useState<LocalProjectWorkspace | null>(null);

  const applyLocalFiles = React.useCallback(
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

  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({
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

  const activeProject = projects.find((project) => project.id === projectId) ?? null;
  const browserWorkspace = projectId || localProject ? (
    <BrowserWorkspace
      projectId={projectId}
      projectName={activeProject?.name || null}
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
  ) : null;

  if (turns.length === 0) {
    return (
      <div className="mobile-chat flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="nx-rise flex flex-col items-center pb-6 pt-8">
          <Wordmark size={44} sweep={false} />
          <p className="mt-3 max-w-[22ch] text-center text-[14px] leading-snug text-ink-3">
            Hi {name} — describe it and Trove builds it.
          </p>
        </div>

        <div className="nx-rise-slow">
          <MobileComposer
            onSend={send}
            disabled={busy}
            {...composerProps}
            key={draft}
            initialValue={draft}
          />
        </div>

        {browserWorkspace ? (
          <div className="mt-3">{browserWorkspace}</div>
        ) : null}

        {error ? <Problem message={error} onRetry={retry} /> : null}

        <div className="nx-rise-slow -mx-4 mt-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="press flex h-[44px] shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-4 text-[13.5px] text-ink-2 transition-colors active:bg-hover"
              >
                <t.icon size={16} className="shrink-0 text-ink" />
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {activity.length === 0 ? (
          <StarterCards className="mt-7" onPick={setDraft} />
        ) : null}

        {activity.length ? (
          <div className="mt-7">
            <h2 className="mb-1.5 px-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-4">
              Recent
            </h2>
            <ul className="nx-stagger space-y-0.5">
              {activity.slice(0, 6).map((r) => (
                <li key={`${r.kind}-${r.href}-${r.title}`}>
                  <Link
                    href={r.href}
                    className="block truncate rounded-[var(--r-panel)] px-3 py-2.5 text-[14.5px] text-ink-2 transition-colors active:bg-hover"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mobile-chat flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0 truncate text-[13px] text-ink-4">
          {turns[0]?.text.slice(0, 48)}
        </span>
        <button
          type="button"
          onClick={clear}
          className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors active:bg-hover"
        >
          New
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-3">
        {browserWorkspace}
        {turns.map((t, i) => (
          <Message
            key={t.id}
            role={t.role}
            text={t.text}
            files={t.files}
            pending={busy && i === turns.length - 1 && t.role === "model"}
          />
        ))}
        {error ? <Problem message={error} onRetry={retry} /> : null}
        <div ref={bottom} />
      </div>

      <div className="mobile-composer-dock shrink-0 border-t border-line/60 bg-canvas/95 px-3 pt-2 backdrop-blur-md">
        <MobileComposer
          onSend={send}
          disabled={busy}
          placeholder="Message Trove…"
          {...composerProps}
        />
      </div>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-4" compact />;
}
