"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiUsers,
  FiGlobe,
  FiBell,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiCheck,
  FiX,
  TbSparkles,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  active: boolean;
  createdAt: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  plan: string;
  emailVerified: boolean;
  createdAt: number | null;
};

type SiteRow = {
  slug: string;
  title: string;
  userId: string | null;
  updatedAt: number | null;
  url: string;
  live: boolean;
};

const TABS = [
  { id: "announce" as const, label: "Announcements", Icon: FiBell },
  { id: "users" as const, label: "Users", Icon: FiUsers },
  { id: "sites" as const, label: "Published sites", Icon: FiGlobe },
];

export function AdminView({ email }: { email: string }) {
  const [tab, setTab] = useState<"announce" | "users" | "sites">("announce");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [items, setItems] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const loadAnn = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) setItems(data.items);
    } catch {
      /* */
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) setUsers(data.items);
    } catch {
      /* */
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sites");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) setSites(data.items);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    void loadAnn();
  }, [loadAnn]);

  useEffect(() => {
    if (tab === "users") void loadUsers();
    if (tab === "sites") void loadSites();
  }, [tab, loadUsers, loadSites]);

  function resetForm() {
    setTitle("");
    setBody("");
    setImageUrl("");
    setEditId(null);
  }

  async function publish() {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (editId) {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            title,
            body,
            imageUrl: imageUrl.trim() || null,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Update failed");
        setMsg("Announcement updated.");
        resetForm();
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            imageUrl: imageUrl.trim() || null,
            active: true,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Publish failed");
        setMsg("Announcement published.");
        resetForm();
      }
      await loadAnn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(a: Announcement) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, active: !a.active }),
      });
      if (res.ok) await loadAnn();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/announcements?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        if (editId === id) resetForm();
        await loadAnn();
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a: Announcement) {
    setEditId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setImageUrl(a.imageUrl || "");
    setMsg(null);
  }

  const activeCount = items.filter((i) => i.active).length;
  const liveSites = sites.filter((s) => s.live).length;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 20% 0%, rgba(99,102,241,0.1), transparent 55%), radial-gradient(ellipse 50% 35% at 90% 10%, rgba(244,114,182,0.06), transparent 50%)",
        }}
      />

      <div className="mx-auto max-w-[1080px] px-5 py-8 lg:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Control center
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Admin</h1>
            <p className="mt-1 text-[13.5px] text-ink-3">
              Signed in as <span className="font-medium text-ink-2">{email}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatChip label="Active announcements" value={activeCount} tone="indigo" />
            <StatChip label="Users" value={users.length || "—"} tone="sky" />
            <StatChip
              label="Live sites"
              value={tab === "sites" ? liveSites : "—"}
              tone="emerald"
            />
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-1.5 rounded-[14px] border border-line bg-raised/80 p-1.5 backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.Icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13.5px] font-medium transition",
                  on
                    ? "bg-ink text-white shadow-sm"
                    : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {msg ? (
          <div className="mb-4 rounded-[12px] border border-line bg-raised px-4 py-2.5 text-[13.5px] text-ink-2">
            {msg}
          </div>
        ) : null}

        {tab === "announce" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            <section className="rounded-[18px] border border-line bg-raised/90 p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  <TbSparkles size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">
                    {editId ? "Edit announcement" : "New announcement"}
                  </h2>
                  <p className="text-[12.5px] text-ink-4">
                    Shown globally to everyone who visits Trove.
                  </p>
                </div>
              </div>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's new"
                  className="h-11 w-full rounded-[12px] border border-line bg-canvas px-3.5 text-[14px] text-ink outline-none focus:border-ink-4"
                />
              </label>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Body</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Short message users will see…"
                  className="w-full resize-none rounded-[12px] border border-line bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink-4"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">
                  Image URL <span className="text-ink-4">(optional — photo card)</span>
                </span>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-11 w-full rounded-[12px] border border-line bg-canvas px-3.5 text-[14px] text-ink outline-none focus:border-ink-4"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !title.trim() || !body.trim()}
                  onClick={() => void publish()}
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-ink px-5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {editId ? <FiCheck size={16} /> : <FiPlus size={16} />}
                  {editId ? "Save changes" : "Publish"}
                </button>
                {editId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-line px-4 text-[14px] text-ink-2 hover:bg-hover"
                  >
                    <FiX size={16} />
                    Cancel
                  </button>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[12.5px] font-medium text-ink-4">
                {items.length} announcement{items.length === 1 ? "" : "s"}
              </p>
              {items.map((a) => (
                <article
                  key={a.id}
                  className={cn(
                    "overflow-hidden rounded-[16px] border bg-raised transition",
                    a.active ? "border-line" : "border-dashed border-line/70 opacity-70",
                  )}
                >
                  <div className="flex gap-0">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="hidden h-auto w-[120px] shrink-0 object-cover sm:block"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-semibold text-ink">{a.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{a.body}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                            a.active
                              ? "bg-positive/15 text-positive"
                              : "bg-sunk text-ink-4",
                          )}
                        >
                          {a.active ? "Active" : "Off"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 hover:bg-hover"
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(a)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 hover:bg-hover"
                        >
                          {a.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] text-critical hover:bg-critical/10"
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!items.length ? (
                <div className="rounded-[16px] border border-dashed border-line px-4 py-12 text-center text-[13.5px] text-ink-4">
                  No announcements yet. Publish one to show it site-wide.
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {tab === "users" ? (
          <section className="overflow-hidden rounded-[18px] border border-line bg-raised/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Users</h2>
                <p className="text-[12.5px] text-ink-4">{users.length} accounts</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-sunk/40 text-[11px] uppercase tracking-wider text-ink-4">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Verified</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/50 transition hover:bg-hover/50">
                      <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                      <td className="px-5 py-3 text-ink-3">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[12px] font-medium capitalize text-indigo-700 dark:text-indigo-300">
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.emailVerified ? (
                          <span className="text-positive">Yes</span>
                        ) : (
                          <span className="text-ink-4">No</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-4">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length ? (
                <p className="px-5 py-12 text-center text-[13.5px] text-ink-4">No users loaded.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "sites" ? (
          <section className="space-y-3">
            <p className="text-[13px] text-ink-3">
              Published on{" "}
              <code className="rounded bg-sunk px-1.5 py-0.5 text-[12.5px] text-ink">
                *.troveai.site
              </code>
              . Wildcard DNS must point at this Vercel project.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sites.map((s) => (
                <li
                  key={s.slug}
                  className="flex flex-col rounded-[16px] border border-line bg-raised p-4 transition hover:border-line-strong hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.2)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{s.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        s.live ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4",
                      )}
                    >
                      {s.live ? "Live" : "Empty"}
                    </span>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 truncate text-[12.5px] text-accent hover:underline"
                  >
                    {s.url}
                    <FiExternalLink size={12} />
                  </a>
                  <p className="mt-3 text-[11.5px] text-ink-4">
                    {s.updatedAt ? `Updated ${new Date(s.updatedAt).toLocaleString()}` : "—"}
                  </p>
                </li>
              ))}
            </ul>
            {!sites.length ? (
              <div className="rounded-[16px] border border-dashed border-line px-4 py-12 text-center text-[13.5px] text-ink-4">
                No published sites yet.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "indigo" | "sky" | "emerald";
}) {
  const tones = {
    indigo: "from-indigo-500/15 to-violet-500/10 text-indigo-700 dark:text-indigo-300",
    sky: "from-sky-500/15 to-cyan-500/10 text-sky-700 dark:text-sky-300",
    emerald: "from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div
      className={cn(
        "rounded-[14px] border border-line bg-gradient-to-br px-3.5 py-2.5 text-center",
        tones[tone],
      )}
    >
      <p className="text-[18px] font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="text-[11px] font-medium text-ink-4">{label}</p>
    </div>
  );
}
