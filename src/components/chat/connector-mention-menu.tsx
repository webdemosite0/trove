"use client";

import * as React from "react";
import Link from "next/link";
import { ServiceMark } from "@/components/integrations/service-mark";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";

export interface ConnectedConnectorOption {
  id: string;
  name: string;
  account?: string;
  direct?: boolean;
}

export interface SkillMentionOption {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  source: "builtin" | "custom";
}

export interface ConnectorMentionMatch {
  start: number;
  end: number;
  query: string;
}

export function connectorMentionAt(
  value: string,
  cursor: number,
): ConnectorMentionMatch | null {
  const before = value.slice(0, Math.max(0, cursor));
  const match = before.match(/(^|[\s(])@([a-z0-9._-]*)$/i);
  if (!match) return null;

  const query = match[2] ?? "";
  return {
    start: before.length - query.length - 1,
    end: before.length,
    query: query.toLowerCase(),
  };
}

export function filterConnectorOptions(
  items: ConnectedConnectorOption[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 8);
  return items
    .filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.account?.toLowerCase().includes(q),
    )
    .slice(0, 8);
}

export function useConnectedConnectors(enabled: boolean) {
  const [items, setItems] = React.useState<ConnectedConnectorOption[]>([]);
  const [skills, setSkills] = React.useState<SkillMentionOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const loaded = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    setLoading(true);

    Promise.all([
      fetch("/api/connectors", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return { items: [] };
          return (await res.json()) as { items?: ConnectedConnectorOption[] };
        })
        .catch(() => ({ items: [] as ConnectedConnectorOption[] })),
      fetch("/api/tro/skills", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return { skills: [] };
          return (await res.json()) as { skills?: SkillMentionOption[] };
        })
        .catch(() => ({ skills: [] as SkillMentionOption[] })),
    ])
      .then(([connData, skillData]) => {
        setItems(Array.isArray(connData.items) ? connData.items : []);
        setSkills(Array.isArray(skillData.skills) ? skillData.skills : []);
      })
      .catch(() => {
        loaded.current = false;
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { items, skills, loading };
}

export function filterSkillOptions(items: SkillMentionOption[], query: string) {
  const q = query.trim().toLowerCase();
  const list = q
    ? items.filter(
        (s) =>
          s.slug.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    : items;
  return list.slice(0, 8);
}

export function ConnectorMentionMenu({
  items,
  skills = [],
  query,
  loading,
  onSelect,
  onSelectSkill,
  compact = false,
  className,
}: {
  items: ConnectedConnectorOption[];
  skills?: SkillMentionOption[];
  query: string;
  loading: boolean;
  onSelect: (item: ConnectedConnectorOption) => void;
  onSelectSkill?: (skill: SkillMentionOption) => void;
  compact?: boolean;
  className?: string;
}) {
  const filtered = React.useMemo(
    () => filterConnectorOptions(items, query),
    [items, query],
  );
  const filteredSkills = React.useMemo(
    () => filterSkillOptions(skills, query),
    [skills, query],
  );
  const { openSettings } = useNav();
  const openConnectors = () => openSettings("integrations");

  return (
    <div
      className={cn(
        "absolute z-40 overflow-hidden rounded-2xl border border-line bg-raised/98 shadow-[0_18px_50px_rgba(0,0,0,.16)] backdrop-blur-xl",
        compact
          ? "bottom-full mb-2 left-2 right-2"
          : "bottom-full mb-2 left-3 w-[min(340px,calc(100%-24px))]",
        className,
      )}
      onPointerDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-3.5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
          Connected integrations
        </span>
        <button
          type="button"
          onClick={openConnectors}
          className="text-[11.5px] font-medium text-accent hover:underline"
        >
          Manage
        </button>
      </div>

      <div className="max-h-[248px] overflow-y-auto p-1.5">
        {loading ? (
          <p className="px-3 py-4 text-[12.5px] text-ink-4">Loading integrations…</p>
        ) : (
          <>
            {filteredSkills.length ? (
              <>
                <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                  Skills
                </p>
                {filteredSkills.map((skill) => (
                  <button
                    key={`skill:${skill.slug}`}
                    type="button"
                    onClick={() => onSelectSkill?.(skill)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-hover"
                  >
                    <span className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-accent/10 text-[16px]">
                      {skill.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {skill.name}
                        </span>
                        {skill.source === "custom" ? (
                          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-accent">
                            Custom
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-4">
                        {skill.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-4">@{skill.slug}</span>
                  </button>
                ))}
              </>
            ) : null}
            {filtered.length ? (
              <>
                {filteredSkills.length ? (
                  <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                    Integrations
                  </p>
                ) : null}
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-hover"
                  >
                    <ServiceMark id={item.id} name={item.name} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {item.name}
                        </span>
                        {item.direct ? (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400">
                            Live
                          </span>
                        ) : null}
                      </span>
                      {item.account ? (
                        <span className="block truncate text-[11.5px] text-ink-4">
                          {item.account}
                        </span>
                      ) : (
                        <span className="block text-[11.5px] text-ink-4">
                          Connected
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] text-ink-4">@{item.id}</span>
                  </button>
                ))}
              </>
            ) : null}
            {!filtered.length && !filteredSkills.length ? (
              <div className="px-3 py-4">
                <p className="text-[12.5px] text-ink-3">
                  {items.length || skills.length
                    ? "Nothing matches that name."
                    : "No integrations connected yet."}
                </p>
                {!items.length && !skills.length ? (
                  <button
                    type="button"
                    onClick={openConnectors}
                    className="mt-1.5 inline-block text-[12px] font-medium text-accent hover:underline"
                  >
                    Connect an app
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
