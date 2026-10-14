"use client";

import { useEffect } from "react";
import { clearAnonymousDraft, loadAnonymousDraft } from "@/lib/anonymous-draft";

/**
 * The homepage saves a visitor's brief on their device before they sign up.
 * When they reach a new chat, put it back in the message box (once) unless the
 * URL already brought it (?q=) or an existing conversation is open.
 */
export function useRestoredBrief(opts: { initial: string; enabled: boolean; onRestore: (text: string) => void }) {
  const { initial, enabled, onRestore } = opts;
  useEffect(() => {
    const saved = loadAnonymousDraft<{ text?: unknown }>("chat");
    if (!saved) return;
    // Either way the brief has now reached the app; don't offer it again.
    clearAnonymousDraft("chat");
    const text = typeof saved.data?.text === "string" ? saved.data.text.trim() : "";
    if (enabled && !initial && text) onRestore(text.slice(0, 2000));
    // Runs once, when the chat opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
