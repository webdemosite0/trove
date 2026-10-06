import { NextResponse, type NextRequest } from "next/server";

/** Reachable without an account. Everything else needs one. */
const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/about",
  "/features",
  "/templates",
  "/changelog",
  "/ai-presentation-maker",
  "/ai-document-generator",
  "/ai-spreadsheet-generator",
  "/ai-agents",
  "/ai-research",
  "/privacy",
  "/terms",
  "/security",
  "/status",
  // Anonymous build entry (P4: build before signup). The page itself renders a
  // guest-friendly wizard; creating anything still requires an account.
  "/tros/new",
]);

const PUBLIC_PREFIXES = [
  "/.well-known/",
  "/features/",
  "/verify-email",
  "/api/auth/",
  "/api/health",
  "/api/billing/webhook",
  "/api/site/",
  "/api/mascots/",
  "/api/crew/",
  "/api/cron/",
  "/r/",
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

function secureAppResponse(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Preview / staging deployments must never be indexed.
  if ((process.env.VERCEL_ENV ?? "production") !== "production") {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self), browsing-topics=()",
  );
  // Do not includeSubDomains: user-published sites currently live on wildcard
  // subdomains and must remain independently deployable until publishing moves
  // to a separate registrable domain.
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000");
  }
  return res;
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

/**
 * Forwards the invoked pathname to server components (read via headers()).
 * Lets the shell guard allow anonymous build entries like /tros/new without
 * weakening auth anywhere else.
 */
function withInvokePath(req: NextRequest, pathname: string): { headers: Headers } {
  const headers = new Headers(req.headers);
  headers.set("x-invoke-path", pathname);
  return { headers };
}

export function middleware(req: NextRequest) {
  const subdomain = subdomainRewrite(req);
  if (subdomain) return subdomain;

  const { pathname, search } = req.nextUrl;

  const toApex = canonicalHost(req);
  if (toApex) return secureAppResponse(toApex);

  if (isPublic(pathname)) {
    const res = pinUi(req, NextResponse.next({ request: withInvokePath(req, pathname) }));
    if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
    return secureAppResponse(res);
  }

  if (req.cookies.has("nx_session")) {
    return secureAppResponse(pinUi(req, NextResponse.next({ request: withInvokePath(req, pathname) })));
  }

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return secureAppResponse(res);
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + search);

  const res = pinUi(req, NextResponse.redirect(url));
  // This header belongs to the originally requested private URL, so crawlers
  // can remove stale "Sign in · Trove" results even though the response redirects.
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
  return secureAppResponse(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|google[0-9a-z]+\\.html).*)",
  ],
};
