"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface SavedMessage {
  role: "user" | "model";
  text: string;
  /** The provider cut this reply off at the token limit. */
  truncated?: boolean;
}

/**
 * R2 (P1): the outcome of a save. Callers MUST check `ok` before claiming
 * anything was saved — a failed save used to resolve silently (void), so
 * editors flashed "Saved" and navigated nowhere while the write had 500'd.
 */
export interface SaveResult {
  ok: boolean;
  /** The saved conversation id (present when ok). */
  id?: string;
  /** Human-readable reason (present when !ok). */
  error?: string;
}

/**
 * Persists a thread after each completed exchange.
 *
 * The server streams the model response straight through to the browser, so
 * the client is the only place that holds the finished text — which is why the
 * save is issued from here rather than inside the API route.
 *
 * The conversation id is kept in a ref, not state: it must be readable by the
 * next save immediately, and it never affects what is rendered.
 */
const WORKSPACE_ROOTS: Record<string, string> = {
  docs: "/documents",
  sheets: "/spreadsheets",
  slides: "/slides",
  design: "/design",
  research: "/research",
};

/**
 * The active workspace id the sidebar switcher mirrors into the `trove_ws`
 * cookie. null = Personal (the implicit default — cookie absent or "personal").
 */
function activeWorkspaceIdFromCookie(): string | null {
  try {
    const m = /(?:^|;\s*)trove_ws=([^;]*)/.exec(document.cookie);
    const v = m ? decodeURIComponent(m[1]) : "";
    return v && v !== "personal" ? v : null;
  } catch {
    return null;
  }
}

export function useSaved(kind: string, initialId?: string | null) {
  const router = useRouter();
  const idRef = useRef<string | null>(initialId ?? null);

  const save = useCallback(
    async (messages: SavedMessage[], title?: string): Promise<SaveResult> => {
      const usable = messages.filter((m) => m.text.trim());
      if (!usable.length) return { ok: false, error: "Nothing to save." };

      const wasNew = !idRef.current;

      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: idRef.current,
            kind,
            title: title ?? usable[0].text,
            messages: usable,
            // Tag the new thread with the active workspace so the recents
            // lists can filter by it. The server validates ownership.
            workspaceId: activeWorkspaceIdFromCookie(),
            // Where this thread lives. Reported by the page that owns it
            // rather than derived from `kind` on the server: a central map
            // silently produced "/?c=..." for kinds missing from it, which
            // landed on the marketing page instead of the conversation.
            path: window.location.pathname,
          }),
        });
        // R2 (P1): a failed save must come back as a failure, never as a
        // silent void. Editors show "Saved" and navigate only on ok:true.
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const message =
            (data && typeof data.error === "string" && data.error) ||
            `Save failed (${res.status}).`;
          return { ok: false, error: message };
        }
        const data = await res.json();
        if (!data?.id) {
          return { ok: false, error: "Save failed: the server returned no id." };
        }
        idRef.current = data.id;
        window.dispatchEvent(new Event("trove:shell-meta-refresh"));
        const workspaceRoot = WORKSPACE_ROOTS[kind];

        // Creation happens on the clean product page. Once the first result
        // is saved, move into a permanent workspace route for that artefact.
        if (workspaceRoot) {
          if (wasNew) {
            router.replace(`${workspaceRoot}/${encodeURIComponent(data.id)}`);
          }
          return { ok: true, id: data.id };
        }

        // Legacy tools still keep their conversation id in the query string.
        const url = new URL(window.location.href);
        if (url.searchParams.get("c") !== data.id) {
          url.searchParams.set("c", data.id);
          window.history.replaceState(null, "", url.toString());
        }
        return { ok: true, id: data.id };
      } catch (e) {
        // Network-level failure (offline, aborted). Best-effort callers
        // (chat threads) ignore the result; editors surface it honestly.
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Save failed.",
        };
      }
    },
    [kind, router],
  );

  const reset = useCallback(() => {
    idRef.current = null;
    const workspaceRoot = WORKSPACE_ROOTS[kind];
    if (workspaceRoot) {
      router.push(workspaceRoot);
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("c")) {
      url.searchParams.delete("c");
      window.history.replaceState(null, "", url.toString());
    }
  }, [kind, router]);

  return { save, reset, id: idRef };
}
