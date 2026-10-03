"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, SPECIES, SPECIES_META, speciesFromSeed } from "@/components/agents/bot";
import { Composer } from "@/components/chat/composer";
import { Thinking } from "@/components/chat/thinking";
import { updateAgent, type AgentRow } from "@/app/actions/agents";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-2xl border border-line-strong bg-sunk/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-[14px]";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "instructions", label: "Instructions" },
  { id: "knowledge", label: "Knowledge" },
  { id: "memory", label: "Memory" },
  { id: "tools", label: "Tools" },
  { id: "test", label: "Test" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AVAILABLE_TOOLS = [
  "Search the web",
  "Cloud computer",
  "Documents",
  "Read repository",
  "Send email",
  "Query database",
  "Create image",
  "Schedule task",
];

const TONES = ["Professional", "Friendly", "Concise", "Playful", "Formal"];

/** Capability description per connected service. */
function capabilityFor(service: string): string {
  const s = service.toLowerCase();
  if (s.includes("gmail") || s.includes("mail")) return "Read, draft, send email";
  if (s.includes("calendar")) return "Read, create events";
  if (s.includes("drive") || s.includes("dropbox")) return "Read, upload files";
  if (s.includes("slack") || s.includes("discord") || s.includes("teams")) return "Read, post messages";
  if (s.includes("github") || s.includes("gitlab")) return "Read, create issues & PRs";
  if (s.includes("notion") || s.includes("docs")) return "Read, create pages";
  if (s.includes("sheet")) return "Read, edit spreadsheets";
  if (s.includes("stripe") || s.includes("payment")) return "Read (no charges without approval)";
  if (s.includes("yango") || s.includes("indrive") || s.includes("careem") || s.includes("uber")) return "Book rides via browser (approval required)";
  return "Read & act via integration";
}

export function TroEdit({ agent }: { agent: AgentRow }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("profile");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft state (unsaved edits).
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [tone, setTone] = useState("Professional");
  const [responsibilities, setResponsibilities] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [instructions, setInstructions] = useState(agent.instructions);
  const [species, setSpecies] = useState<string | null>(agent.species);
  const [accent, setAccent] = useState(agent.accent || "#3b82f6");
  const [tools, setTools] = useState<string[]>(() => {
    try {
      const t = JSON.parse(agent.tools);
      return Array.isArray(t) ? t : [];
    } catch {
      return [];
    }
  });
  const dirty = useRef(false);

  const effectiveSpecies = species || speciesFromSeed(agent.id);

  function markDirty() {
    dirty.current = true;
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Compose full instructions from parts.
    const full = [
      instructions.trim(),
      responsibilities.trim() ? `\n\nResponsibilities:\n${responsibilities.trim()}` : "",
      boundaries.trim() ? `\n\nBoundaries:\n${boundaries.trim()}` : "",
      `\n\nTone: ${tone}.`,
    ].join("");
    const res = await updateAgent(agent.id, {
      name,
      role,
      instructions: full,
      tools,
      accent,
      species,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Save failed.");
      return;
    }
    dirty.current = false;
    setSavedAt(Date.now());
    router.refresh();
  }

  function toggleTool(t: string) {
    markDirty();
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-line px-5 py-4">
        <Bot size={48} species={effectiveSpecies as never} accent={accent} state="idle" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold text-ink">
            Edit {name || "Tro"}
          </h1>
          <p className="truncate text-[13px] text-ink-3">{role}</p>
        </div>
        <button
          onClick={() => router.push(`/tros/${agent.id}`)}
          className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 transition hover:text-ink"
        >
          Back to chat
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save changes"}
        </button>
      </div>
      {error && (
        <p className="bg-critical/10 px-5 py-2 text-[13px] text-critical">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-3 text-[14px] font-medium transition",
              tab === t.id
                ? "border-accent text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {tab === "profile" && (
          <ProfilePanel
            name={name} setName={(v) => { setName(v); markDirty(); }}
            role={role} setRole={(v) => { setRole(v); markDirty(); }}
            tone={tone} setTone={(v) => { setTone(v); markDirty(); }}
            responsibilities={responsibilities} setResponsibilities={(v) => { setResponsibilities(v); markDirty(); }}
            boundaries={boundaries} setBoundaries={(v) => { setBoundaries(v); markDirty(); }}
            species={effectiveSpecies} setSpecies={(v) => { setSpecies(v); markDirty(); }}
            accent={accent} setAccent={(v) => { setAccent(v); markDirty(); }}
          />
        )}
        {tab === "instructions" && (
          <InstructionsPanel instructions={instructions} setInstructions={(v) => { setInstructions(v); markDirty(); }} />
        )}
        {tab === "knowledge" && <KnowledgePanel agentId={agent.id} />}
        {tab === "memory" && <MemoryPanel agentId={agent.id} />}
        {tab === "tools" && (
          <ToolsPanel agentId={agent.id} tools={tools} toggleTool={toggleTool} />
        )}
        {tab === "test" && (
          <TestPanel
            agentId={agent.id}
            draft={{ name, role, instructions, tools }}
            hasUnsaved={dirty.current}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Profile ------------------------------- */

function ProfilePanel(p: {
  name: string; setName: (v: string) => void;
  role: string; setRole: (v: string) => void;
  tone: string; setTone: (v: string) => void;
  responsibilities: string; setResponsibilities: (v: string) => void;
  boundaries: string; setBoundaries: (v: string) => void;
  species: string; setSpecies: (v: string) => void;
  accent: string; setAccent: (v: string) => void;
}) {
  const ACCENTS = ["#3b82f6", "#a78bfa", "#34d399", "#f472b6", "#fbbf24", "#38bdf8", "#fb923c", "#2dd4bf"];
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-2">Mascot</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {SPECIES.map((s) => {
            const meta = SPECIES_META[s];
            const active = p.species === s;
            return (
              <button
                key={s}
                onClick={() => p.setSpecies(s)}
                title={`${meta.label} — ${meta.vibe}`}
                className={cn(
                  "flex flex-col items-center rounded-2xl border p-2 transition",
                  active ? "border-accent bg-accent/10" : "border-line hover:border-ink-4",
                )}
              >
                <Bot size={40} species={s as never} state="idle" />
                <span className="mt-1 text-[10px] font-medium text-ink-3">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-2">Accent color</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => p.setAccent(c)}
              className={cn(
                "size-9 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-raised)] transition",
                p.accent === c ? "ring-accent" : "ring-transparent",
              )}
              style={{ background: c }}
              aria-label={`Accent ${c}`}
            />
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Name</span>
        <input value={p.name} onChange={(e) => p.setName(e.target.value)} className={field} placeholder="e.g. Research lead" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Role</span>
        <input value={p.role} onChange={(e) => p.setRole(e.target.value)} className={field} placeholder="e.g. Market research specialist" />
      </label>

      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Tone</span>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => p.setTone(t)}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-medium transition",
                p.tone === t ? "bg-accent/15 text-accent" : "bg-sunk text-ink-3 hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Responsibilities</span>
        <textarea value={p.responsibilities} onChange={(e) => p.setResponsibilities(e.target.value)} rows={3} className={cn(field, "resize-y")} placeholder="What this Tro is responsible for…" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Boundaries</span>
        <textarea value={p.boundaries} onChange={(e) => p.setBoundaries(e.target.value)} rows={3} className={cn(field, "resize-y")} placeholder="What this Tro should never do…" />
      </label>
    </div>
  );
}

/* ---------------------------- Instructions ---------------------------- */

function InstructionsPanel(p: { instructions: string; setInstructions: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-3">
        The system prompt that defines how this Tro behaves. Be specific about tasks, style, and constraints.
      </p>
      <textarea
        value={p.instructions}
        onChange={(e) => p.setInstructions(e.target.value)}
        rows={16}
        className={cn(field, "resize-y font-mono text-[13px] leading-relaxed")}
        placeholder="You are a…"
      />
      <p className="text-[12px] text-ink-4">{p.instructions.length} characters</p>
    </div>
  );
}

/* ----------------------------- Knowledge ----------------------------- */

function KnowledgePanel({ agentId }: { agentId: string }) {
  const [sources, setSources] = useState<{ id: string; title: string; excerpt: string; chars: number; source: string; created_at: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tro/knowledge?agentId=${encodeURIComponent(agentId)}`);
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [agentId]);

  async function add() {
    if (!title.trim() || !content.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/tro/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to add.");
      setTitle("");
      setContent("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this knowledge source?")) return;
    await fetch(`/api/tro/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-raised p-4">
        <p className="mb-3 text-[14px] font-semibold text-ink">Add reference material</p>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          className={field} placeholder="Title — e.g. Brand guidelines"
        />
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          rows={5} className={cn(field, "mt-2 resize-y")}
          placeholder="Paste the document content here…"
        />
        {error && <p className="mt-2 text-[13px] text-critical">{error}</p>}
        <button
          onClick={add} disabled={adding || !title.trim() || !content.trim()}
          className="mt-3 rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {adding ? "Adding…" : "Add to knowledge"}
        </button>
      </div>

      <div>
        <p className="mb-3 text-[14px] font-semibold text-ink">
          Indexed sources ({sources.length})
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-ink-3"><Thinking size={18} /><span className="text-[13px]">Loading…</span></div>
        ) : sources.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-ink-4">
            No knowledge sources yet. Add documents above and this Tro will reference them in answers.
          </p>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-line bg-raised p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-3">{s.excerpt}…</p>
                  <p className="mt-1 text-[11.5px] text-ink-4">
                    {(s.chars / 1000).toFixed(1)}k chars · {s.source} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="rounded-full border border-line px-3 py-1.5 text-[12px] text-critical transition hover:bg-critical/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Memory ------------------------------ */

type Memory = { id: string; kind: string; content: string; enabled: number; updated_at: number };

function MemoryPanel({ agentId }: { agentId: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newKind, setNewKind] = useState("preference");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tro/memories?agentId=${encodeURIComponent(agentId)}`);
      const data = await res.json();
      setMemories(data.memories ?? []);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [agentId]);

  async function add() {
    if (!newContent.trim() || adding) return;
    setAdding(true);
    await fetch("/api/tro/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, content: newContent.trim(), kind: newKind }),
    });
    setNewContent("");
    setAdding(false);
    await load();
  }

  async function toggleEnabled(m: Memory) {
    await fetch("/api/tro/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, id: m.id, enabled: !m.enabled }),
    });
    await load();
  }

  async function saveEdit(m: Memory) {
    if (!editText.trim()) return;
    await fetch("/api/tro/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, id: m.id, content: editText.trim() }),
    });
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this memory?")) return;
    await fetch(`/api/tro/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  const prefs = memories.filter((m) => m.kind === "preference");
  const tasks = memories.filter((m) => m.kind === "task");

  function section(label: string, items: Memory[], desc: string) {
    return (
      <div>
        <p className="mb-1 text-[14px] font-semibold text-ink">{label} ({items.length})</p>
        <p className="mb-3 text-[12.5px] text-ink-4">{desc}</p>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-4 text-center text-[13px] text-ink-4">None yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <div key={m.id} className={cn("rounded-2xl border p-4", m.enabled ? "border-line bg-raised" : "border-line/50 bg-sunk opacity-60")}>
                {editingId === m.id ? (
                  <div>
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className={cn(field, "resize-y")} />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => saveEdit(m)} className="rounded-full bg-accent px-4 py-1.5 text-[12px] font-semibold text-white">Save</button>
                      <button onClick={() => setEditingId(null)} className="rounded-full border border-line px-4 py-1.5 text-[12px] text-ink-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-2">{m.content}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => toggleEnabled(m)}
                        title={m.enabled ? "Disable memory" : "Enable memory"}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[12px] transition",
                          m.enabled ? "border-line text-ink-2 hover:text-ink" : "border-accent/40 text-accent",
                        )}
                      >
                        {m.enabled ? "On" : "Off"}
                      </button>
                      <button
                        onClick={() => { setEditingId(m.id); setEditText(m.content); }}
                        className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 transition hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        className="rounded-full border border-line px-3 py-1.5 text-[12px] text-critical transition hover:bg-critical/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-raised p-4">
        <p className="mb-3 text-[14px] font-semibold text-ink">Add a memory</p>
        <div className="mb-2 flex gap-2">
          {(["preference", "task"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setNewKind(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium capitalize transition",
                newKind === k ? "bg-accent/15 text-accent" : "bg-sunk text-ink-3 hover:text-ink",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <textarea
          value={newContent} onChange={(e) => setNewContent(e.target.value)}
          rows={3} className={cn(field, "resize-y")}
          placeholder={newKind === "preference" ? "e.g. User prefers concise summaries…" : "e.g. Completed Q3 report on Oct 1…"}
        />
        <button
          onClick={add} disabled={adding || !newContent.trim()}
          className="mt-3 rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {adding ? "Adding…" : "Add memory"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-3"><Thinking size={18} /><span className="text-[13px]">Loading…</span></div>
      ) : (
        <>
          {section("Personal preferences", prefs, "What this Tro remembers about you.")}
          {section("Task history", tasks, "Notes from past work.")}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Tools ------------------------------- */

function ToolsPanel({ agentId, tools, toggleTool }: {
  agentId: string;
  tools: string[];
  toggleTool: (t: string) => void;
}) {
  const [connectors, setConnectors] = useState<{ service: string; label: string; account: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tro/connectors");
        const data = await res.json();
        setConnectors(data.connectors ?? []);
      } catch {
        setConnectors([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-[14px] font-semibold text-ink">Built-in tools</p>
        <p className="mb-3 text-[12.5px] text-ink-4">Toggle what this Tro can do on its own.</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map((t) => {
            const on = tools.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTool(t)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition",
                  on ? "border-accent/50 bg-accent/10 text-ink" : "border-line bg-sunk text-ink-4 hover:text-ink-2",
                )}
              >
                <span className={cn("size-2 rounded-full", on ? "bg-accent" : "bg-ink-4")} />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[14px] font-semibold text-ink">Connected services</p>
        <p className="mb-3 text-[12.5px] text-ink-4">
          What this Tro can do with each connected integration. Manage connections in Settings → Connectors.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-ink-3"><Thinking size={18} /><span className="text-[13px]">Loading…</span></div>
        ) : connectors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-ink-4">
            No services connected. Connect them in Settings → Connectors.
          </p>
        ) : (
          <div className="space-y-2">
            {connectors.map((c) => (
              <div key={c.service} className="flex items-center gap-3 rounded-2xl border border-line bg-raised p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-[14px] font-bold text-accent">
                  {c.label.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{c.label}</p>
                  <p className="text-[12.5px] text-ink-3">{capabilityFor(c.service)}</p>
                  {c.account && <p className="text-[11.5px] text-ink-4">{c.account}</p>}
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11.5px] font-medium text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 rounded-2xl bg-sunk p-3 text-[12px] leading-relaxed text-ink-4">
          Write actions (send, publish, book) always require your explicit approval in chat before the Tro executes them.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Test -------------------------------- */

type TestMsg = { role: "user" | "model"; text: string };

function TestPanel({ agentId, draft, hasUnsaved }: {
  agentId: string;
  draft: { name: string; role: string; instructions: string; tools: string[] };
  hasUnsaved: boolean;
}) {
  const [messages, setMessages] = useState<TestMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    const next: TestMsg[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    const rid = next.length;
    setMessages((m) => [...m, { role: "model", text: "" }]);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: next,
          // Pass unsaved draft so users test before saving.
          override: hasUnsaved
            ? { name: draft.name, role: draft.role, instructions: draft.instructions, tools: draft.tools }
            : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out += decoder.decode(value, { stream: true });
        const snapshot = out;
        setMessages((m) => m.map((x, i) => (i === rid ? { ...x, text: snapshot } : x)));
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : "Request failed.";
      setMessages((m) => m.map((x, i) => (i === rid ? { ...x, text: `⚠️ ${err}` } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      {hasUnsaved && (
        <p className="mb-3 rounded-2xl bg-accent/10 px-4 py-2.5 text-[12.5px] text-accent">
          Testing with your <strong>unsaved changes</strong> — save to make them permanent.
        </p>
      )}
      <div className="min-h-[280px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-sunk/40 p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-4">
            Send a message to test this Tro{hasUnsaved ? " with your current edits" : ""}.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                m.role === "user" ? "ml-auto bg-accent text-white" : "bg-raised text-ink-2 border border-line",
              )}
            >
              {m.text || <Thinking size={16} />}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3">
        <Composer
          onSend={send}
          placeholder={`Test ${draft.name || "this Tro"}…`}
          compact
          busy={busy}
          allowAttachments={false}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-ink-4">
        Sandbox — test messages are not saved to any conversation.
      </p>
    </div>
  );
}
