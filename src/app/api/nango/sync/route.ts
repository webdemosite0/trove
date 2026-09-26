export const runtime = "nodejs";

/** Nango removed — use POST /api/composio/sync */
export async function POST() {
  return Response.json(
    {
      error: "Nango is no longer used. Use POST /api/composio/sync after connecting with Composio.",
    },
    { status: 410 },
  );
}
