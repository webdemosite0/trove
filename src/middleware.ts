import { NextResponse, type NextRequest } from "next/server";

/** Reachable without an account. Everything else needs one. */
const PUBLIC_PAGES = new Set(["/", "/login", "/signup", "/pricing", "/about"]);

const PUBLIC_PREFIXES = [
  "/features/",
  "/verify-email",
  "/api/auth/",
  "/api/health",
  "/api/billing/webhook",
  "/api/site/",
  "/s/",
];

const PUBLISH_ROOT_DOMAIN = String(
  process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN || "troveai.site",
)
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/^\*\./, "")
  .replace(/\/$/, "");

function isPublic(pathname: string) {
  if (PUBLIC_PAGES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Pins the UI when ?ui=mobile or ?ui=desktop is on the URL.
 * lib/device.ts reads the resulting cookie.
 */
function pinUi(req: NextRequest, res: NextResponse): NextResponse {
  const asked = req.nextUrl.searchParams.get("ui");
  if (asked === "mobile" || asked === "desktop") {
    res.cookies.set("nx_ui", asked, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  } else if (asked === "auto") {
    res.cookies.delete("nx_ui");
  }
  return res;
}

/** Keep one canonical app hostname instead of splitting SEO signals with www. */
function canonicalHost(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host");
  if (!host?.startsWith("www.")) return null;

  const url = req.nextUrl.clone();
  url.host = host.slice(4);
  url.port = "";
  return NextResponse.redirect(url, 308);
}

/** System hosts that must never be treated as a user-published site. */
const RESERVED_HOST_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "builder",
  "login",
  "signup",
  "auth",
  "support",
  "billing",
  "docs",
  "status",
  "mail",
  "cdn",
  "static",
  "assets",
  "help",
  "blog",
  "studio",
  "sites",
  "trove",
  "preview",
  "local",
  "localhost",
]);

function requestHostname(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const raw = forwarded || req.headers.get("host") || req.nextUrl.hostname || "";
  return raw.split(":")[0].trim().toLowerCase();
}

/**
 * xyz.<publish-root-domain>/<path> -> /s/xyz/<path>
 *
 * Preserve the original path so published websites can serve CSS, JS, images,
 * favicons and SPA deep links from the same wildcard hostname. A single label
 * is allowed before the root domain to match the one-project/one-domain model.
 */
function subdomainRewrite(req: NextRequest): NextResponse | null {
  const host = requestHostname(req);
  const suffix = `.${PUBLISH_ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".") || RESERVED_HOST_SLUGS.has(slug)) return null;

  const url = req.nextUrl.clone();
  if (url.pathname.startsWith("/api/site/") || url.pathname.startsWith("/s/")) {
    return null;
  }

  const originalPath = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/s/${slug}${originalPath}`;
  return NextResponse.rewrite(url);
}

export function middleware(req: NextRequest) {
  const subdomain = subdomainRewrite(req);
  if (subdomain) return subdomain;

  const { pathname, search } = req.nextUrl;

  const toApex = canonicalHost(req);
  if (toApex) return toApex;

  if (isPublic(pathname)) {
    const res = pinUi(req, NextResponse.next());
    if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
    return res;
  }

  if (req.cookies.has("nx_session")) return pinUi(req, NextResponse.next());

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + search);

  const res = pinUi(req, NextResponse.redirect(url));
  if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|google[0-9a-z]+\\.html).*)",
  ],
};
