import { MASCOT_IMAGES } from "@/lib/mascot-images";

export const runtime = "nodejs";
export const dynamic = "force-static";

const NAMES = new Set(Object.keys(MASCOT_IMAGES));

/**
 * GET /api/mascots/[name]
 * Serves the transparent Tro mascot PNGs (embedded as base64 in
 * src/lib/mascot-images.ts so no binary assets live in the repo).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const key = name.replace(/\.(png|webp)$/, "");
  if (!NAMES.has(key)) {
    return new Response("Not found", { status: 404 });
  }
  const buf = Buffer.from(MASCOT_IMAGES[key], "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buf.length),
    },
  });
}
