"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  FiPaperclip,
  FiLink,
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

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, WebP…).");
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("File is larger than 4 MB. Choose a smaller image.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      if (img.width <= max && img.height <= max && dataUrl.length < 900_000) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function AdminView({ email }: { email: string }) {
  const [tab, setTab] = useState<"announce" | "users" | "sites">("announce");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"file" | "url">("file");
  const [items, setItems] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setImageMode("file");
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await fileToDataUrl(file);
      setImageUrl(url);
      setImageMode("file");
      setMsg("Image ready — publish to show it.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load image");
    } finally {
      setBusy(false);
    }
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
        setMsg("Announcement published globally.");
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
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
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
    setImageMode(a.imageUrl?.startsWith("data:") ? "file" : "url");
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
            "radial-gradient(ellipse 70% 45% at 15% 0%, rgba(99,102,241,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 15%, rgba(244,114,182,0.08), transparent 50%)",
        }}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-8 lg:py-12">
        <header className="nx-fade-up mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Control center
            </p>
            <h1 className="mt-1 text-[clamp(1.75rem,1.4rem+1.2vw,2.15rem)] font-semibold tracking-tight text-ink">
              Admin
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-3">
              Signed in as <span className="font-medium text-ink-2">{email}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <StatChip label="Active banners" value={activeCount} tone="indigo" />
            <StatChip label="Users" value={users.length || "—"} tone="sky" />
            <StatChip label="Live sites" value={tab === "sites" ? liveSites : "—"} tone="emerald" />
          </div>
        </header>

        <div className="nx-fade-up mb-8 flex flex-wrap gap-1.5 rounded-[18px] border border-line bg-raised/90 p-1.5 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.Icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] px-5 py-3.5 text-[14px] font-medium transition duration-200 sm:flex-none",
                  on
                    ? "bg-ink text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]"
                    : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <Icon size={17} />
                {t.label}
              </button>
            );
          })}
        </div>

        {msg ? (
          <div className="nx-fade-up mb-5 rounded-[16px] border border-line bg-raised px-5 py-3.5 text-[14px] text-ink-2 shadow-sm">
            {msg}
          </div>
        ) : null}

        {tab === "announce" ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <section className="nx-scale-in overflow-hidden rounded-[24px] border border-line bg-raised/95 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent px-6 py-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/25 to-violet-500/20 text-indigo-600 dark:text-indigo-300">
                  <TbSparkles size={20} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight text-ink">
                    {editId ? "Edit announcement" : "New global announcement"}
                  </h2>
                  <p className="text-[12.5px] text-ink-4">
                    Photo card appears site-wide for every visitor.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's new"
                    className="h-12 w-full rounded-[14px] border border-line bg-canvas px-4 text-[15px] text-ink outline-none transition focus:border-ink-4 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Body</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Short message users will see…"
                    className="w-full resize-none rounded-[14px] border border-line bg-canvas px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink-4 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-ink-3">Image</span>
                    <div className="flex rounded-full border border-line bg-sunk/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setImageMode("file")}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11.5px] font-medium transition",
                          imageMode === "file" ? "bg-raised text-ink shadow-sm" : "text-ink-4",
                        )}
                      >
                        Device file
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode("url")}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11.5px] font-medium transition",
                          imageMode === "url" ? "bg-raised text-ink shadow-sm" : "text-ink-4",
                        )}
                      >
                        Photo URL
                      </button>
                    </div>
                  </div>

                  {imageMode === "file" ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) void onPickFile(f);
                      }}
                      className={cn(
                        "relative flex min-h-[160px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] border-2 border-dashed px-4 py-8 transition",
                        dragOver
                          ? "border-indigo-400 bg-indigo-500/10"
                          : "border-line bg-sunk/40 hover:border-ink-4/40",
                      )}
                    >
                      {imageUrl && imageUrl.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-40"
                        />
                      ) : null}
                      <div className="relative z-[1] flex flex-col items-center gap-2 text-center">
                        <span className="grid size-12 place-items-center rounded-2xl bg-raised shadow-sm">
                          <FiPaperclip size={20} className="text-ink-3" />
                        </span>
                        <p className="text-[14px] font-medium text-ink">
                          Drop an image here, or browse
                        </p>
                        <p className="text-[12px] text-ink-4">PNG, JPG, WebP · under 4 MB</p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => fileRef.current?.click()}
                          className="mt-1 rounded-full border border-line bg-raised px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-hover"
                        >
                          Choose from device
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-line bg-sunk text-ink-4">
                        <FiLink size={16} />
                      </span>
                      <input
                        value={imageUrl.startsWith("data:") ? "" : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://…"
                        className="h-11 w-full rounded-[14px] border border-line bg-canvas px-3.5 text-[14px] text-ink outline-none focus:border-ink-4"
                      />
                    </div>
                  )}

                  {imageUrl ? (
                    <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-line bg-canvas p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-16 w-24 rounded-[10px] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-ink">Preview attached</p>
                        <p className="truncate text-[11.5px] text-ink-4">
                          {imageUrl.startsWith("data:") ? "Uploaded from device" : imageUrl}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="grid size-8 place-items-center rounded-full text-ink-4 hover:bg-hover hover:text-ink"
                        aria-label="Remove image"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || !title.trim() || !body.trim()}
                    onClick={() => void publish()}
                    className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-ink px-6 text-[14.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {editId ? <FiCheck size={16} /> : <FiPlus size={16} />}
                    {editId ? "Save changes" : "Publish"}
                  </button>
                  {editId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-line px-5 text-[14px] text-ink-2 hover:bg-hover"
                    >
                      <FiX size={16} />
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="nx-stagger-kids space-y-3">
              <p className="text-[12.5px] font-medium text-ink-4">
                {items.length} announcement{items.length === 1 ? "" : "s"}
              </p>
              {items.map((a) => (
                <article
                  key={a.id}
                  className={cn(
                    "overflow-hidden rounded-[20px] border bg-raised/95 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-22px_rgba(15,23,42,0.35)]",
                    a.active ? "border-line" : "border-dashed border-line/70 opacity-75",
                  )}
                >
                  <div className="flex flex-col sm:flex-row">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="h-36 w-full object-cover sm:h-auto sm:w-[140px] sm:min-h-[120px]"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-indigo-500/15 to-violet-500/10 sm:h-auto sm:w-[100px]">
                        <TbSparkles size={22} className="text-indigo-500/70" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[15px] font-semibold text-ink">{a.title}</p>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{a.body}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                            a.active ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4",
                          )}
                        >
                          {a.active ? "Active" : "Off"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 hover:bg-hover"
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(a)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 hover:bg-hover"
                        >
                          {a.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] text-critical hover:bg-critical/10"
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!items.length ? (
                <div className="rounded-[20px] border border-dashed border-line px-6 py-16 text-center text-[14px] text-ink-4">
                  No announcements yet. Publish one with a photo for the global banner.
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {tab === "users" ? (
          <section className="nx-scale-in overflow-hidden rounded-[24px] border border-line bg-raised/95 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.35)]">
            <div className="border-b border-line bg-gradient-to-r from-sky-500/10 to-transparent px-6 py-4">
              <h2 className="text-[16px] font-semibold text-ink">Users</h2>
              <p className="text-[12.5px] text-ink-4">{users.length} accounts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-sunk/40 text-[11px] uppercase tracking-wider text-ink-4">
                    <th className="px-6 py-3.5 font-semibold">Name</th>
                    <th className="px-6 py-3.5 font-semibold">Email</th>
                    <th className="px-6 py-3.5 font-semibold">Plan</th>
                    <th className="px-6 py-3.5 font-semibold">Verified</th>
                    <th className="px-6 py-3.5 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/50 transition hover:bg-hover/50">
                      <td className="px-6 py-3.5 font-medium text-ink">{u.name}</td>
                      <td className="px-6 py-3.5 text-ink-3">{u.email}</td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[12px] font-medium capitalize text-indigo-700 dark:text-indigo-300">
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {u.emailVerified ? (
                          <span className="text-positive">Yes</span>
                        ) : (
                          <span className="text-ink-4">No</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-ink-4">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length ? (
                <p className="px-6 py-14 text-center text-[14px] text-ink-4">No users loaded.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "sites" ? (
          <section className="nx-stagger-kids space-y-3">
            <p className="text-[13.5px] text-ink-3">
              Published on{" "}
              <code className="rounded-md bg-sunk px-1.5 py-0.5 text-[12.5px] text-ink">
                *.troveai.site
              </code>
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {sites.map((s) => (
                <li
                  key={s.slug}
                  className="flex flex-col rounded-[20px] border border-line bg-raised/95 p-5 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-20px_rgba(15,23,42,0.32)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{s.title}</p>
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
                    className="mt-2 inline-flex items-center gap-1 truncate text-[13px] text-accent hover:underline"
                  >
                    {s.url}
                    <FiExternalLink size={12} />
                  </a>
                  <p className="mt-3 text-[12px] text-ink-4">
                    {s.updatedAt ? `Updated ${new Date(s.updatedAt).toLocaleString()}` : "—"}
                  </p>
                </li>
              ))}
            </ul>
            {!sites.length ? (
              <div className="rounded-[20px] border border-dashed border-line px-6 py-14 text-center text-[14px] text-ink-4">
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
    indigo: "from-indigo-500/15 to-violet-500/10",
    sky: "from-sky-500/15 to-cyan-500/10",
    emerald: "from-emerald-500/15 to-teal-500/10",
  };
  return (
    <div
      className={cn(
        "min-w-[100px] rounded-[16px] border border-line bg-gradient-to-br px-4 py-3 text-center shadow-sm",
        tones[tone],
      )}
    >
      <p className="text-[20px] font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="text-[11px] font-medium text-ink-4">{label}</p>
    </div>
  );
}
