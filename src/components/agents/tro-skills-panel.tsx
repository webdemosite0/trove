"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit3, FiPlus, FiTrash2, FiX, FiZap } from "react-icons/fi";
import { cn } from "@/lib/utils";

export interface TroSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  source: "builtin" | "custom";
  connector: string | null;
  instructions?: string;
}

const ICON_CHOICES = ["✨", "🔬", "📥", "📋", "✍️", "🎯", "💡", "🚀", "📊", "🎨", "💬", "⚡"];

export function TroSkillsPanel() {
  const [skills, setSkills] = useState<TroSkill[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TroSkill | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [icon, setIcon] = useState("✨");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/tro/skills", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok && Array.isArray(d?.skills)) setSkills(d.skills);
    } catch {
      /* keep old list */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setInstructions("");
    setIcon("✨");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(skill: TroSkill) {
    setEditing(skill);
    setName(skill.name);
    setDescription(skill.description);
    setInstructions(skill.instructions ?? "");
    setIcon(skill.icon);
    setFormError(null);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      const url = editing ? `/api/tro/skills/${editing.id}` : "/api/tro/skills";
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, instructions, icon }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Could not save skill.");
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save skill.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(skill: TroSkill) {
    if (!confirm(`Delete the "${skill.name}" skill?`)) return;
    try {
      const r = await fetch(`/api/tro/skills/${skill.id}`, { method: "DELETE" });
      if (r.ok) load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
          Skills
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110"
        >
          <FiPlus size={13} /> New skill
        </button>
      </div>

      <p className="px-4 pb-3 text-[11.5px] leading-relaxed text-ink-4">
        Type <span className="font-mono text-ink-3">/</span> in chat to invoke a
        skill — the Tro behaves from it. <span className="font-mono text-ink-3">@</span> is
        for connectors.
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {skills === null ? (
          <p className="px-2 py-6 text-center text-[12.5px] text-ink-4">Loading skills…</p>
        ) : skills.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12.5px] text-ink-4">
            No skills yet. Create one to give your Tros reusable behaviors.
          </p>
        ) : (
          skills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-2xl border border-line bg-raised p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-[18px]">
                  {skill.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {skill.name}
                    </p>
                    {skill.source === "custom" ? (
                      <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-accent">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-3">
                    {skill.description || "No description."}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] text-ink-4">
                    /{skill.slug}
                  </p>
                </div>
                {skill.source === "custom" ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(skill)}
                      aria-label={`Edit ${skill.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-4 transition hover:bg-hover hover:text-ink"
                    >
                      <FiEdit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(skill)}
                      aria-label={`Delete ${skill.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-4 transition hover:bg-critical/10 hover:text-critical"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-line bg-raised p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-ink">
                {editing ? "Edit skill" : "New skill"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
              >
                <FiX size={16} />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Launch checklist"
                className="w-full rounded-xl border border-line bg-sunk px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">
                Description <span className="text-ink-4">(shown in the @menu)</span>
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Step-by-step launch QA for every release"
                className="w-full rounded-xl border border-line bg-sunk px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent"
              />
            </label>

            <div className="mt-3">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">Icon</span>
              <div className="flex flex-wrap gap-1.5">
                {ICON_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setIcon(c)}
                    className={cn(
                      "grid size-9 place-items-center rounded-xl border text-[18px] transition",
                      icon === c
                        ? "border-accent bg-accent/10"
                        : "border-line hover:bg-hover",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">
                Instructions <span className="text-ink-4">(how the Tro should behave)</span>
              </span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={"When this skill is active:\n1. First do…\n2. Then do…\n3. Format output as…"}
                rows={6}
                className="w-full resize-y rounded-xl border border-line bg-sunk px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none focus:border-accent"
              />
            </label>

            {formError ? (
              <p className="mt-3 text-[12.5px] text-critical">{formError}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !name.trim() || !instructions.trim()}
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                <FiZap size={13} />
                {saving ? "Saving…" : editing ? "Save changes" : "Create skill"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
