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
    // Column may not exist until migration runs on next boot.
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

/** Block appended to system prompts so the model follows the user permanently. */
export async function instructionsBlock(): Promise<string> {
  const text = (await getInstructions()).trim();
  if (!text) return "";
  return (
    `\n\nCUSTOM INSTRUCTIONS FROM THE USER (always follow these preferences):\n` +
    text +
    `\n`
  );
}

/** Connected apps the model is allowed to mention and request actions for. */
export async function connectedToolsBlock(): Promise<string> {
  const user = await currentUser();
  if (!user) return "";
  const list = await listConnections();
  if (!list.length) {
    return (
      "\n\nCONNECTED APPS: none yet. If the user asks to use GitHub, Figma, Vercel, etc., " +
      "tell them to connect the app under Integrations first."
    );
  }
  const names = list.map((c) => c.service).join(", ");
  return (
    `\n\nCONNECTED APPS (user authorized these — you may use them when they @mention or ask): ${names}.\n` +
    `When they write @github or ask to list repos / create a repo, the server can call GitHub with their token.\n` +
    `For other apps, describe what you would do and point them to the matching workspace (Websites deploy, etc.) if a full API action is not available yet.\n`
  );
}
