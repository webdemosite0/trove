"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiUsers,
  FiActivity,
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

type AnalyticsEventRow = {
  event: string;
  count: number;
  uniqueUsers: number;
};

type AnalyticsDailyRow = {
  day: string;
  count: number;
  uniqueUsers: number;
};

type AnalyticsSummary = {
  days: number;
  since: number;
  events: AnalyticsEventRow[];
  daily: AnalyticsDailyRow[];
};

const TABS = [
  { id: "analytics" as const, label: "Launch", Icon: FiActivity },
  { id: "announce" as const, label: "Announcements", Icon: FiBell },
  { id: "users" as const, label: "Users", Icon: FiUsers },
  { id: "sites" as const, label: "Published sites", Icon: FiGlobe },
];

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 4 * 1024 * 1024) throw new Error("File larger than 4 MB.");
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
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function AdminView({ email }: { email: string }) {
  const [tab, setTab] = useState<"analytics" | "announce" | "users" | "sites">("analytics");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"file" | "url">("file");
  const [items, setItems] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
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
    } catch { /* */ }
  }, []);
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) setUsers(data.items);
    } catch { /* */ }
  }, []);
  const loadSites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sites");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) setSites(data.items);
    } catch { /* */ }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics?days=30", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.events) && Array.isArray(data?.daily)) {
        setAnalytics(data as AnalyticsSummary);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { void loadAnn(); }, [loadAnn]);
  useEffect(() => {
    if (tab === "analytics") void loadAnalytics();
    if (tab === "users") void loadUsers();
    if (tab === "sites") void loadSites();
  }, [tab, loadAnalytics, loadUsers, loadSites]);

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
      setImageUrl(await fileToDataUrl(file));
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
      const payload = { title, body, imageUrl: imageUrl.trim() || null, ...(editId ? { id: editId } : { active: true }) };
      const res = await fetch("/api/admin/announcements", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMsg(editId ? "Announcement updated." : "Announcement published globally.");
      resetForm();
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
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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

  function metric(event: string) {
    return analytics?.events.find((row) => row.event === event) ?? {
      event,
      count: 0,
      uniqueUsers: 0,
    };
  }

  const signupMetric = metric("signup_completed");
  const firstPromptMetric = metric("first_prompt");
  const builderMetric = metric("builder_project_created");
  const checkoutStartMetric = metric("checkout_started");
  const checkoutCreatedMetric = metric("checkout_created");
  const checkoutFailedMetric = metric("checkout_failed");
  const activationRate =
    signupMetric.uniqueUsers > 0
      ? Math.round((firstPromptMetric.uniqueUsers / signupMetric.uniqueUsers) * 100)
      : 0;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 15% 0%, rgba(99,102,241,0.1), transparent 55%), radial-gradient(ellipse 45% 35% at 95% 10%, rgba(244,114,182,0.06), transparent 50%)",
        }}
      />
      <div className="mx-auto max-w-[1040px] px-4 py-7 sm:px-5 lg:py-10">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Control center</p>
            <h1 className="mt-1 text-[clamp(1.55rem,1.25rem+1vw,1.95rem)] font-semibold tracking-tight text-ink">Admin</h1>
            <p className="mt-1 text-[13.5px] text-ink-3">
              Signed in as <span className="font-medium text-ink-2">{email}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatChip label="Active banners" value={activeCount} tone="indigo" />
            <StatChip label="Users" value={users.length || "—"} tone="sky" />
            <StatChip label="Live sites" value={tab === "sites" ? liveSites : "—"} tone="emerald" />
          </div>
        </header>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-[16px] border border-line/90 bg-raised p-1 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.2)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.Icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13.5px] font-medium transition sm:flex-1",
                  on ? "bg-ink text-white shadow-sm" : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {msg ? (
          <div className="mb-4 rounded-[14px] border border-line bg-raised px-4 py-3 text-[13.5px] text-ink-2 shadow-sm">{msg}</div>
        ) : null}

        {tab === "analytics" ? (
          <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <LaunchMetric
                label="Signups"
                value={signupMetric.uniqueUsers}
                detail="Unique accounts created"
              />
              <LaunchMetric
                label="Activated"
                value={firstPromptMetric.uniqueUsers}
                detail="Users who sent a first prompt"
              />
              <LaunchMetric
                label="Activation rate"
                value={`${activationRate}%`}
                detail="First prompt ÷ signups"
              />
              <LaunchMetric
                label="Builder users"
                value={builderMetric.uniqueUsers}
                detail="Created a website project"
              />
              <LaunchMetric
                label="Checkout starts"
                value={checkoutStartMetric.uniqueUsers}
                detail="Unique users who began checkout"
              />
              <LaunchMetric
                label="Checkout created"
                value={checkoutCreatedMetric.uniqueUsers}
                detail="Payment checkout successfully created"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="overflow-hidden rounded-[18px] border border-line bg-raised shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">30-day funnel events</h2>
                    <p className="text-[12px] text-ink-4">
                      Content-free product analytics only
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadAnalytics()}
                    className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-ink-2 hover:bg-hover"
                  >
                    Refresh
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-line bg-sunk/30 text-[11px] uppercase tracking-wide text-ink-4">
                        <th className="px-5 py-3 font-semibold">Event</th>
                        <th className="px-5 py-3 font-semibold">Events</th>
                        <th className="px-5 py-3 font-semibold">Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics?.events ?? []).map((row) => (
                        <tr key={row.event} className="border-b border-line/50">
                          <td className="px-5 py-3 font-medium text-ink">
                            {row.event.replaceAll("_", " ")}
                          </td>
                          <td className="px-5 py-3 tabular-nums text-ink-3">{row.count}</td>
                          <td className="px-5 py-3 tabular-nums text-ink-3">{row.uniqueUsers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!analytics?.events?.length ? (
                    <p className="px-5 py-10 text-center text-[13px] text-ink-4">
                      No launch events recorded yet.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[18px] border border-line bg-raised p-5 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)]">
                <h2 className="text-[15px] font-semibold text-ink">What needs attention</h2>
                <div className="mt-4 space-y-3">
                  <HealthLine
                    label="Checkout failures"
                    value={checkoutFailedMetric.count}
                    ok={checkoutFailedMetric.count === 0}
                  />
                  <HealthLine
                    label="Activation"
                    value={`${activationRate}%`}
                    ok={signupMetric.uniqueUsers === 0 || activationRate >= 25}
                  />
                  <HealthLine
                    label="Builder adoption"
                    value={builderMetric.uniqueUsers}
                    ok={firstPromptMetric.uniqueUsers === 0 || builderMetric.uniqueUsers > 0}
                  />
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                    Recent activity
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {(analytics?.daily ?? []).slice(-7).reverse().map((row) => (
                      <div key={row.day} className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span className="text-ink-4">{row.day}</span>
                        <span className="tabular-nums text-ink-2">
                          {row.uniqueUsers} users · {row.count} events
                        </span>
                      </div>
                    ))}
                    {!analytics?.daily?.length ? (
                      <p className="text-[12.5px] text-ink-4">No activity yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "announce" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-[18px] border border-line bg-raised shadow-[0_16px_48px_-28px_rgba(15,23,42,0.25)]">
              <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-indigo-500/10 to-transparent px-5 py-3.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  <TbSparkles size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">{editId ? "Edit announcement" : "New announcement"}</h2>
                  <p className="text-[12px] text-ink-4">Shown site-wide as a photo card</p>
                </div>
              </div>
              <div className="space-y-3.5 p-5">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-ink-3">Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's new" className="h-11 w-full rounded-[12px] border border-line bg-canvas px-3.5 text-[14px] text-ink outline-none focus:border-ink-4" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-ink-3">Body</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Short message…" className="w-full resize-none rounded-[12px] border border-line bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink-4" />
                </label>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-ink-3">Image</span>
                    <div className="flex rounded-full border border-line bg-sunk/40 p-0.5">
                      {(["file", "url"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setImageMode(m)} className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", imageMode === m ? "bg-raised text-ink shadow-sm" : "text-ink-4")}>
                          {m === "file" ? "Device" : "URL"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {imageMode === "file" ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void onPickFile(f); }}
                      className={cn("flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-3 py-6 transition", dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-line bg-sunk/30")}
                    >
                      <FiPaperclip size={18} className="text-ink-4" />
                      <p className="text-[13px] text-ink-3">Drop image or browse</p>
                      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] font-medium text-ink">Choose file</button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FiLink size={16} className="text-ink-4" />
                      <input value={imageUrl.startsWith("data:") ? "" : imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="h-10 w-full rounded-[12px] border border-line bg-canvas px-3 text-[13.5px] text-ink outline-none" />
                    </div>
                  )}
                  {imageUrl ? (
                    <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-line bg-canvas p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />
                      <p className="min-w-0 flex-1 truncate text-[12px] text-ink-4">{imageUrl.startsWith("data:") ? "Uploaded" : imageUrl}</p>
                      <button type="button" onClick={() => setImageUrl("")} className="p-1 text-ink-4 hover:text-ink"><FiX size={14} /></button>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" disabled={busy || !title.trim() || !body.trim()} onClick={() => void publish()} className="inline-flex h-11 items-center gap-1.5 rounded-[12px] bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-50">
                    {editId ? <FiCheck size={15} /> : <FiPlus size={15} />}
                    {editId ? "Save" : "Publish"}
                  </button>
                  {editId ? (
                    <button type="button" onClick={resetForm} className="h-11 rounded-[12px] border border-line px-4 text-[13.5px] text-ink-2">Cancel</button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <p className="text-[12px] font-medium text-ink-4">{items.length} announcement{items.length === 1 ? "" : "s"}</p>
              {items.map((a) => (
                <article key={a.id} className={cn("overflow-hidden rounded-[16px] border bg-raised shadow-sm transition hover:-translate-y-0.5", a.active ? "border-line" : "border-dashed border-line/70 opacity-80")}>
                  <div className="flex flex-col sm:flex-row">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt="" className="h-28 w-full object-cover sm:h-auto sm:w-[120px]" />
                    ) : (
                      <div className="flex h-16 items-center justify-center bg-indigo-500/10 sm:h-auto sm:w-16"><TbSparkles size={18} className="text-indigo-500/60" /></div>
                    )}
                    <div className="min-w-0 flex-1 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-semibold text-ink">{a.title}</p>
                          <p className="mt-0.5 text-[13px] text-ink-3">{a.body}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", a.active ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4")}>
                          {a.active ? "Active" : "Off"}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => startEdit(a)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-2 hover:bg-hover"><FiEdit2 size={11} className="mr-1 inline" />Edit</button>
                        <button type="button" onClick={() => void toggleActive(a)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-2 hover:bg-hover">{a.active ? "Deactivate" : "Activate"}</button>
                        <button type="button" onClick={() => void remove(a.id)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-critical hover:bg-critical/10"><FiTrash2 size={11} className="mr-1 inline" />Delete</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!items.length ? <div className="rounded-[16px] border border-dashed border-line px-4 py-12 text-center text-[13.5px] text-ink-4">No announcements yet.</div> : null}
            </section>
          </div>
        ) : null}

        {tab === "users" ? (
          <section className="overflow-hidden rounded-[18px] border border-line bg-raised shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)]">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold text-ink">Users</h2>
              <p className="text-[12px] text-ink-4">{users.length} accounts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-sunk/30 text-[11px] uppercase tracking-wide text-ink-4">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Verified</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/50 hover:bg-hover/40">
                      <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                      <td className="px-5 py-3 text-ink-3">{u.email}</td>
                      <td className="px-5 py-3"><span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[12px] capitalize text-indigo-700 dark:text-indigo-300">{u.plan}</span></td>
                      <td className="px-5 py-3">{u.emailVerified ? <span className="text-positive">Yes</span> : <span className="text-ink-4">No</span>}</td>
                      <td className="px-5 py-3 text-ink-4">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length ? <p className="px-5 py-12 text-center text-ink-4">No users loaded.</p> : null}
            </div>
          </section>
        ) : null}

        {tab === "sites" ? (
          <section className="space-y-3">
            <p className="text-[13px] text-ink-3">Published on <code className="rounded bg-sunk px-1.5 py-0.5 text-[12px]">*.troveai.site</code></p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sites.map((s) => (
                <li key={s.slug} className="rounded-[16px] border border-line bg-raised p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_rgba(15,23,42,0.22)]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{s.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.live ? "bg-positive/15 text-positive" : "bg-sunk text-ink-4")}>{s.live ? "Live" : "Empty"}</span>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 truncate text-[12.5px] text-accent hover:underline">{s.url}<FiExternalLink size={11} /></a>
                  <p className="mt-2 text-[11.5px] text-ink-4">{s.updatedAt ? `Updated ${new Date(s.updatedAt).toLocaleString()}` : "—"}</p>
                </li>
              ))}
            </ul>
            {!sites.length ? <div className="rounded-[16px] border border-dashed border-line px-4 py-12 text-center text-ink-4">No published sites yet.</div> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number | string; tone: "indigo" | "sky" | "emerald" }) {
  const tones = {
    indigo: "from-indigo-500/12 to-violet-500/8",
    sky: "from-sky-500/12 to-cyan-500/8",
    emerald: "from-emerald-500/12 to-teal-500/8",
  };
  return (
    <div className={cn("min-w-[92px] rounded-[14px] border border-line bg-gradient-to-br px-3.5 py-2.5 text-center shadow-sm", tones[tone])}>
      <p className="text-[18px] font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[10.5px] font-medium text-ink-4">{label}</p>
    </div>
  );
}


function LaunchMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-raised p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[12px] leading-5 text-ink-4">{detail}</p>
    </div>
  );
}

function HealthLine({
  label,
  value,
  ok,
}: {
  label: string;
  value: number | string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] bg-sunk/35 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", ok ? "bg-positive" : "bg-caution")} />
        <span className="text-[12.5px] text-ink-2">{label}</span>
      </div>
      <span className="text-[12.5px] font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
