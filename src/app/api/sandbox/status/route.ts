import { currentUser } from "@/lib/auth";
import { sandboxConfigured } from "@/lib/sandbox";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  return Response.json({
    configured: sandboxConfigured(),
    signedIn: Boolean(user),
    docs: "https://e2b.dev/dashboard",
  });
}
