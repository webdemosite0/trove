export const runtime = "nodejs";

/** Nango removed — use Composio at /api/composio/authorize */
export async function POST() {
  return Response.json(
    {
      error:
        "Nango is no longer used. Open Plugins and connect with Composio, or call POST /api/composio/authorize.",
    },
    { status: 410 },
  );
}
