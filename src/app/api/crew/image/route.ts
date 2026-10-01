import { CREW_IMAGE } from "@/lib/crew-image";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** GET /api/crew/image — the Tros crew group photo (public, long-cached). */
export async function GET() {
  const buf = Buffer.from(CREW_IMAGE, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buf.length),
    },
  });
}
