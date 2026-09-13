"use client";

import { useCallback, useEffect, useState } from "react";
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

export function AdminView({ email }: { email: string }) {
  const [tab, setTab] = useState<"announce" | "users" | "sites">("announce");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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

  async function publish() {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (editId) {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, title, body }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Update failed");
        setMsg("Announcement updated.");
        setEditId(null);
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Failed");
        setMsg("Announcement published — visible to everyone.");
      }
      setTitle("");
      setBody("");
      void loadAnn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(a: Announcement) {
    setBusy(true);
    try {
      await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, active: !a.active }),
      });
      void loadAnn();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      void loadAnn();
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { id: "announce" as const, label: "Announcements" },
    { id: "users" as const, label: "Users" },
    { id: "sites" as const, label: "Published sites" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Control center</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Admin</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Signed in as <span className="text-ink">{email}</span>
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t.id
                ? "bg-accent text-white shadow-[0_8px_24px_-12px_var(--btn-glow)]"
                : "border border-line bg-raised text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg ? (
        <p className="mb-4 rounded-[14px] border border-line bg-raised px-4 py-2.5 text-[13px] text-ink-2">{msg}</p>
      ) : null}

      {tab === "announce" ? (
        <div className="space-y-6">
          <div className="rounded-[20px] border border-line bg-rail/60 p-5 shadow-[var(--sh-2)]">
            <h2 className="text-[15px] font-semibold text-ink">
              {editId ? "Edit announcement" : "New global announcement"}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-4">
              Active banners appear at the top of the app for every signed-in user.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-[14px] border border-line bg-raised px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message body"
                rows={4}
                className="w-full rounded-[14px] border border-line bg-raised px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !title.trim() || !body.trim()}
                  onClick={() => void publish()}
                  className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {editId ? "Save changes" : "Publish"}
                </button>
                {editId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setTitle("");
                      setBody("");
                    }}
                    className="rounded-full border border-line px-4 py-2.5 text-[13px] text-ink-3"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              All announcements · {items.length}
            </h2>
            <ul className="space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="rounded-[16px] border border-line bg-raised p-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-ink">{a.title}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
                            a.active ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4",
                          )}
                        >
                          {a.active ? "Active" : "Off"}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{a.body}</p>
                      <p className="mt-2 text-[11px] text-ink-4">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleActive(a)}
                        className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 hover:bg-hover"
                      >
                        {a.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(a.id);
                          setTitle(a.title);
                          setBody(a.body);
                        }}
                        className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 hover:bg-hover"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(a.id)}
                        className="rounded-full border border-line px-3 py-1.5 text-[12px] text-critical hover:bg-critical/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {!items.length ? (
                <li className="rounded-[16px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-4">
                  No announcements yet.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="overflow-hidden rounded-[20px] border border-line bg-rail/40">
          <div className="border-b border-line px-4 py-3 text-[12px] text-ink-4">{users.length} users</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink-4">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-4 py-2.5 font-medium">Verified</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line/60 hover:bg-hover/40">
                    <td className="px-4 py-2.5 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-2.5 text-ink-3">{u.email}</td>
                    <td className="px-4 py-2.5 capitalize text-ink-2">{u.plan}</td>
                    <td className="px-4 py-2.5">{u.emailVerified ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length ? (
              <p className="px-4 py-8 text-center text-[13px] text-ink-4">No users loaded.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "sites" ? (
        <div className="space-y-3">
          <p className="text-[12.5px] text-ink-4">
            Published subdomains on <code className="text-ink">*.troveai.site</code>. Wildcard DNS must
            point at this Vercel project.
          </p>
          <ul className="space-y-2">
            {sites.map((s) => (
              <li
                key={s.slug}
                className="flex flex-wrap items-center gap-3 rounded-[16px] border border-line bg-raised px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{s.title}</p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[12.5px] text-accent hover:underline"
                  >
                    {s.url}
                  </a>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    s.live ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4",
                  )}
                >
                  {s.live ? "Live" : "Empty"}
                </span>
                <span className="text-[11px] text-ink-4">
                  {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
            {!sites.length ? (
              <li className="rounded-[16px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-4">
                No published sites yet.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
