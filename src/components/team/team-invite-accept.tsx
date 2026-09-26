"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * When the user opens /team?invite=ID while signed in as the invited email,
 * accept the invite in-app (no email required).
 */
export function TeamInviteAccept() {
  const search = useSearchParams();
  const router = useRouter();
  const ran = useRef(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const inviteId = search.get("invite");
    if (!inviteId || ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept", inviteId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setMessage(data?.error || "Could not accept this invitation.");
          return;
        }
        setMessage("You're in. Opening your team workspace…");
        window.dispatchEvent(new Event("trove:team-refresh"));
        router.replace("/team");
        router.refresh();
      } catch {
        setMessage("Could not accept this invitation.");
      }
    })();
  }, [search, router]);

  if (!message) return null;

  return (
    <div className="mx-auto max-w-[720px] px-5 pt-4">
      <p className="rounded-xl border border-line bg-raised px-4 py-3 text-[13px] text-ink-2 shadow-sm">
        {message}
      </p>
    </div>
  );
}
