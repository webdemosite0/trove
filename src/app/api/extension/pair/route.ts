import { currentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { newPairingCode } from "@/lib/extension";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST /api/extension/pair — signed-in user requests a 6-digit pairing code
 * to type into the Trove browser extension. Single-use, 10-minute expiry.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });

  const code = newPairingCode();
  const now = Date.now();
  // Invalidate any previous unused codes for this user first.
  await run(`DELETE FROM extension_pairing_codes WHERE user_id = ?`, [user.id]);
  await run(
    `INSERT INTO extension_pairing_codes (code, user_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)`,
    [code, user.id, now + CODE_TTL_MS, now],
  );
  return Response.json({ code, expiresInSec: CODE_TTL_MS / 1000 });
}
