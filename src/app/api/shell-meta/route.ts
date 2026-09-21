import { currentUser } from "@/lib/auth";
import { countDueReminders } from "@/app/actions/reminders";
import { listAllRecents } from "@/lib/recents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ due: 0, recents: [] }, { status: 401 });
  }

  const [due, recents] = await Promise.all([
    countDueReminders(user.id),
    listAllRecents(6, user.id),
  ]);

  return Response.json(
    { due, recents },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
