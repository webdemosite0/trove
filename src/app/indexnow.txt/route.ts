import { indexNowKey } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IndexNow key ownership file.
 * Search engines fetch this URL to verify INDEXNOW_KEY.
 */
export async function GET() {
  const key = indexNowKey();
  if (!key) {
    return new Response("IndexNow is not configured.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
