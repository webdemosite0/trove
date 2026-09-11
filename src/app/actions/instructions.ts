"use server";

import { setInstructions } from "@/lib/user-prefs";
import { revalidatePath } from "next/cache";

export type InstructionsState = { ok?: boolean; error?: string };

export async function saveInstructions(
  _prev: InstructionsState,
  form: FormData,
): Promise<InstructionsState> {
  const text = String(form.get("instructions") ?? "");
  const result = await setInstructions(text);
  if ("error" in result) return { error: result.error };
  revalidatePath("/settings/instructions");
  revalidatePath("/chat");
  return { ok: true };
}
