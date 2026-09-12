"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function AdminView({ email }: { email: string }) {
  const [tab, setTab] = useState<"announce" | "users" | "deploy">("announce");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendAnnouncement(withImage: boolean) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, prompt: withImage ? prompt || title : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setStatus(data.ok ? "Announcement published." : "Saved.");
      setTitle("");
      setBody("");
      setPrompt("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>
      <p className="mt-1 text-[13px] text-ink-4">Signed in as {email} · email verified required</p>

      <div className="mt-6 flex gap-2">
        {(["announce", "users", "deploy"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] capitalize",
              tab === t ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover",
            )}
          >
            {t === "announce" ? "Announcements" : t === "users" ? "Users" : "Deploy"}
          </button>
        ))}
      </div>

      {tab === "announce" ? (
        <div className="mt-6 space-y-4 rounded-[20px] border border-line bg-rail/50 p-5">
          <p className="text-[13px] text-ink-3">
            Banner announcements show as a large box on the dashboard. Optional AI image from a prompt.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-[12px] border border-line bg-raised px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body"
            rows={4}
            className="w-full rounded-[12px] border border-line bg-raised px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI image prompt (optional)"
            className="w-full rounded-[12px] border border-line bg-raised px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void sendAnnouncement(false)}
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
            >
              Publish banner
            </button>
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void sendAnnouncement(true)}
              className="rounded-full border border-line px-4 py-2 text-[13px] text-ink hover:bg-hover disabled:opacity-40"
            >
              Publish + AI image
            </button>
          </div>
          {status ? <p className="text-[13px] text-ink-3">{status}</p> : null}
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="mt-6 rounded-[20px] border border-line bg-rail/50 p-5 text-[13.5px] text-ink-3">
          User management, credit grants, and plan changes use the database via secure server actions.
          Set <code className="text-ink">ADMIN_EMAILS</code> on Vercel (comma-separated) or plan=admin.
        </div>
      ) : null}

      {tab === "deploy" ? (
        <div className="mt-6 space-y-3 rounded-[20px] border border-line bg-rail/50 p-5 text-[13.5px] text-ink-3">
          <p className="font-medium text-ink">Live subdomains</p>
          <p>
            Each published site can be served at{" "}
            <code className="text-ink">{"{slug}.troveai.site"}</code>. Wire DNS *.troveai.site → Vercel,
            then map slug → project files in storage or E2B snapshot.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Add domain troveai.site + wildcard *.troveai.site in Vercel</li>
            <li>Route middleware: host starts with slug → load published build</li>
            <li>Publish button writes files + slug to DB</li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
