import "server-only";

import { currentUser } from "@/lib/auth";
import { one, run, str } from "@/lib/db";
import { listConnections } from "@/lib/connections";

export async function getInstructions(userId?: string): Promise<string> {
  const user = userId ? { id: userId } : await currentUser();
  if (!user) return "";
  try {
    const row = await one(`SELECT instructions FROM users WHERE id = ?`, [user.id]);
    return row ? str(row.instructions) : "";
  } catch {
    return "";
  }
}

export async function setInstructions(text: string): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in to save instructions." };
  const cleaned = text.slice(0, 4000);
  try {
    await run(`UPDATE users SET instructions = ? WHERE id = ?`, [cleaned, user.id]);
    return { ok: true };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not save. Redeploy so the instructions column migrates.",
    };
  }
}

export function formatInstructionsBlock(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  return (
    `\n\nCUSTOM INSTRUCTIONS FROM THE USER (always follow these preferences):\n` +
    text +
    `\n`
  );
}

export async function instructionsBlock(userId?: string): Promise<string> {
  return formatInstructionsBlock(await getInstructions(userId));
}

/** Connected apps the model is allowed to use with live server-fetched data. */
export async function connectedToolsBlock(): Promise<string> {
  const user = await currentUser();
  if (!user) return "";
  const list = await listConnections();
  if (!list.length) {
    return (
      "\n\nCONNECTED APPS: none yet. If the user asks to use GitHub, Slack, Notion, etc., " +
      "tell them to connect the app under Integrations first — do not pretend you used it."
    );
  }
  const names = list.map((c) => c.service).join(", ");
  return (
    `\n\nCONNECTED APPS (authorized — use LIVE DATA from the system context when present): ${names}.\n` +
    `When live data is supplied below (GitHub repos, Slack messages, …), answer from that data. ` +
    `Never invent channel messages, repos, or files. Never say you cannot use a connected app ` +
    `when it is listed here — if data is missing, say what scope or reconnect step is needed.\n` +
    `Slack: bot token (xoxb-) can list channels and read recent messages; webhook-only can post but not read.\n` +
    `GitHub: list repos / profile when the server injects them.\n`
  );
}
