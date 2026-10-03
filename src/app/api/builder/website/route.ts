import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { saveProject } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Single-pass AI website generation.
 * POST { prompt, projectId?, name? } → { ok, html, projectId, name, message }
 *
 * Generates ONE complete, self-contained index.html (inline CSS, no build
 * step) and saves it as a builder project with target "html".
 */

const FILE_RE = /<<<FILE:\s*([^\n>]+)>>>\s*([\s\S]*?)<<<END>>>/;

const SYSTEM = `You are Trove's web designer — a world-class front-end designer in the league of Framer and Vercel v0 templates.

OUTPUT FORMAT — strict. Reply with exactly one file block, then a SUMMARY line:
<<<FILE: index.html>>>
...the complete HTML document...
<<<END>>>
SUMMARY: one sentence describing the design.

HARD RULES:
- ONE self-contained index.html. All CSS inline in <style> in <head>. Vanilla JS only in a <script> at the end of <body> if needed (keep it light).
- NO external CSS/JS frameworks or CDNs (no Tailwind CDN, no Bootstrap). Google Fonts via <link> are allowed.
- Premium, modern, distinctive design: striking typography (system fonts or Google Fonts), generous whitespace, refined color palette, subtle gradients, tasteful shadows and radii, micro-interactions (hover states, smooth scroll, reveal-on-scroll).
- Fully responsive: mobile-first, works at 360px and at 1440px.
- Real, high-quality copy written for the requested topic — no lorem ipsum, no placeholder brackets.
- ALWAYS include a sticky header/nav (logo left, links center/right, CTA button) and a complete footer (columns of links, social icons, copyright). These are mandatory on every site.
- Build a LONG, complete landing page — never a short one-pager. Minimum sections in order: sticky header, hero (big headline, subcopy, 2 CTAs, visual), logos/social proof strip, features (3-6 cards), how-it-works or showcase, testimonials (2-3), stats, pricing or final CTA, FAQ (optional), full footer. Aim for a rich, scrollable page.
- Use inline SVG for icons/illustrations — no external images (they may not load). CSS gradients and shapes for visuals.
- Valid HTML5, <meta viewport>, semantic tags, accessible contrast.
- Keep total output under ~28KB.`;

function extractHtml(text: string): string | null {
  const m = text.match(new RegExp(FILE_RE.source));
  if (m && m[2]) {
    const html = m[2].replace(/^\n/, "").replace(/\n$/, "").trim();
    if (/<html[\s>]/i.test(html)) return html;
  }
  // Fallback: raw HTML document in the reply.
  const doc = text.match(/<!DOCTYPE html[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  if (doc) return doc[0].trim();
  return null;
}

export async function POST(req: NextRequest) {
  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return NextResponse.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Sign in to build." }, { status: 401 });
  }
  if (!account) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });

  const limited = await expensiveRequestLimit({
    userId: account.userId,
    scope: "builder-website",
    limit: 12,
  });
  if (limited) return limited;

  let body: { prompt?: string; projectId?: string | null; name?: string; currentHtml?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const prompt = String(body.prompt || "").trim().slice(0, 2000);
  if (!prompt) return NextResponse.json({ error: "Describe the website to build." }, { status: 400 });

  const currentHtml = String(body.currentHtml || "").slice(0, 120_000);
  const userTurn = currentHtml
    ? `Here is the current website (full source):\n<<<FILE: index.html>>>\n${currentHtml}\n<<<END>>>\n\nNow apply this change request, keeping everything else intact and the design premium:\n\n${prompt}\n\nReply with the COMPLETE updated index.html in the same file-block format.`
    : `Build this website:\n\n${prompt}`;

  try {
    const text = await generateText({
      turns: [{ role: "user", text: userTurn }],
      system: SYSTEM,
      temperature: 0.7,
      maxOutputTokens: 12000,
      onUsage: (u) => spend(account!.userId, "builder-website", u.totalTokens),
    });

    const html = extractHtml(text || "");
    if (!html) {
      return NextResponse.json({ error: "The AI didn't return a valid page. Try rephrasing." }, { status: 500 });
    }

    const sumMatch = (text || "").match(/SUMMARY:\s*([\s\S]+)$/i);
    const message = sumMatch ? sumMatch[1].trim().slice(0, 400) : "Your website is ready.";

    const name =
      String(body.name || "").trim().slice(0, 80) ||
      prompt.split(/[.\n]/)[0].slice(0, 48) ||
      "Untitled site";

    let projectId = body.projectId || null;
    try {
      const saved = await saveProject({
        id: projectId || undefined,
        name,
        prompt,
        target: "html",
        status: "ready",
        files: [{ path: "index.html", content: html }],
        previewHtml: html,
      });
      if (saved?.id) projectId = saved.id;
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ ok: true, html, projectId, name, message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate failed";
    console.error("builder/website", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
