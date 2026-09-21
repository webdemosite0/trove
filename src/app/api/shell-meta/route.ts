import { currentUser } from "@/lib/auth";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";
import { balanceFor } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ due: 0, recents: [], balance: null }, { status: 401 });
  }

  const [due, recents, balance] = await Promise.all([
    countDueReminders(user.id),
    listAllRecents(6, user.id),
    balanceFor(user.id, user.plan, { email: user.email }).catch(() => null),
  ]);

  return Response.json(
    { due, recents, balance },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
