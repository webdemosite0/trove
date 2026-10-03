// One-time generator: builds src/lib/brand-logos.ts from real brand artwork.
// - simple-icons npm package (60 services, official SVG paths + brand hex)
// - Vendored simple-icons v11 SVGs (12 services removed from latest)
// - PNG favicons in public/brand/ (10 obscure services, referenced by URL)
const fs = require("fs");
const path = require("path");

const si = require("simple-icons");

// service id -> simple-icons slug (current package)
const SIMPLE = {
  "gmail": "gmail", "github": "github", "notion": "notion", "figma": "figma",
  "discord": "discord", "linear": "linear", "airtable": "airtable", "asana": "asana",
  "bitbucket": "bitbucket", "box": "box", "calendly": "calendly", "clickup": "clickup",
  "cloudflare": "cloudflare", "confluence": "confluence", "datadog": "datadog",
  "docker": "docker", "dropbox": "dropbox", "framer": "framer", "gcp": "googlecloud",
  "gitea": "gitea", "gitlab": "gitlab", "google": "google", "google-analytics": "googleanalytics",
  "google-calendar": "googlecalendar", "google-drive": "googledrive",
  "hubspot": "hubspot", "ifttt": "ifttt", "intercom": "intercom", "jira": "jira",
  "lemonsqueezy": "lemonsqueezy", "mailchimp": "mailchimp", "make": "make",
  "meta": "meta", "mixpanel": "mixpanel", "mongodb": "mongodb", "mysql": "mysql",
  "n8n": "n8n", "netlify": "netlify", "paddle": "paddle", "paypal": "paypal",
  "planetscale": "planetscale",
  "postgres": "postgresql", "posthog": "posthog", "quickbooks": "quickbooks",
  "railway": "railway", "redis": "redis", "resend": "resend", "sentry": "sentry",
  "shortcut": "shortcut", "snowflake": "snowflake", "stripe": "stripe",
  "supabase": "supabase", "telegram": "telegram", "trello": "trello",
  "vercel": "vercel", "webflow": "webflow", "whatsapp": "whatsapp",
  "zapier": "zapier", "zendesk": "zendesk", "zoom": "zoom",
};

// service id -> vendored v11 svg filename in /tmp/brand-logos
const VENDORED = {
  "slack": "slack.svg", "aws": "amazonwebservices.svg", "azure": "microsoftazure.svg",
  "canva": "canva.svg", "linkedin": "linkedin.svg", "microsoft-teams": "microsoftteams.svg",
  "onedrive": "microsoftonedrive.svg", "outlook": "microsoftoutlook.svg",
  "salesforce": "salesforce.svg", "twilio": "twilio.svg", "chatgpt": "openai.svg",
  "twitter": "openai.svg", // X logo — use openai? No: twitter/x
};
// fix: twitter should be X logo
delete VENDORED["twitter"];

// service id -> png favicon in public/brand/
const PNGS = ["attio", "crisp", "customerio", "fastmail", "fly", "freshdesk", "height", "pipedrive", "sendgrid", "amplitude"];

// service id -> multicolor SVG filename in /tmp/brand-logos/color (full markup, not single path)
const MULTICOLOR = {
  "google": "google.svg",
  "slack": "slack.svg",
  "gmail": "gmail.svg",
  "google-drive": "googledrive.svg",
  "google-calendar": "googlecalendar.svg",
};

function siKey(slug) {
  return "si" + slug.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
}

const out = {};
let missing = [];

// 1. simple-icons
for (const [svc, slug] of Object.entries(SIMPLE)) {
  const key = siKey(slug);
  const icon = si[key];
  if (!icon) { missing.push(svc + " (si:" + slug + ")"); continue; }
  out[svc] = { path: icon.path, color: "#" + icon.hex };
}

// 2. vendored SVGs — extract path + fill from file
for (const [svc, file] of Object.entries(VENDORED)) {
  const p = path.join("/tmp/brand-logos", file);
  if (!fs.existsSync(p)) { missing.push(svc + " (file:" + file + ")"); continue; }
  const svg = fs.readFileSync(p, "utf8");
  const pathMatch = svg.match(/<path[^>]*d="([^"]+)"/);
  const titleMatch = svg.match(/<title>([^<]+)<\/title>/);
  if (!pathMatch) { missing.push(svc + " (no path)"); continue; }
  // brand color: first fill found, fallback to currentColor
  const fillMatch = svg.match(/fill="(#[0-9a-fA-F]{3,6})"/);
  out[svc] = {
    path: pathMatch[1],
    color: fillMatch ? fillMatch[1] : "currentColor",
    title: titleMatch ? titleMatch[1] : svc,
  };
}

// 3. twitter/X — simple-icons has it as "x"
{
  const icon = si["siX"];
  if (icon) out["twitter"] = { path: icon.path, color: "#" + icon.hex };
  else missing.push("twitter");
}

console.log("SVG logos:", Object.keys(out).length);
console.log("missing:", missing.join(", ") || "none");

// 4. multicolor originals — full SVG markup, ids namespaced per service
const multicolor = {};
for (const [svc, file] of Object.entries(MULTICOLOR)) {
  const p = path.join("/tmp/brand-logos/color", file);
  if (!fs.existsSync(p)) { console.log("multicolor missing:", svc); continue; }
  let svg = fs.readFileSync(p, "utf8");
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || "0 0 24 24";
  let inner = svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  // Namespace all ids so multiple inline copies don't collide.
  const ns = "mc-" + svc.replace(/[^a-z0-9]/g, "");
  inner = inner.replace(/\sid="([^"]*)"/g, ` id="${ns}-$1"`);
  inner = inner.replace(/url\(#([^")]+)\)/g, `url(#${ns}-$1)`);
  inner = inner.replace(/href="#([^"]*)"/g, `href="#${ns}-$1"`);
  multicolor[svc] = { viewBox: vb, body: inner };
  // This service now uses multicolor instead of the monochrome path
  delete out[svc];
}
console.log("multicolor:", Object.keys(multicolor).length);

// Generate TS module
const entries = Object.entries(out)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

// Build PNG data URIs from /tmp/brand-logos/*.png (filenames match service ids)
const pngData = {};
for (const id of PNGS) {
  const p = path.join("/tmp/brand-logos", id + ".png");
  if (fs.existsSync(p)) {
    pngData[id] = "data:image/png;base64," + fs.readFileSync(p).toString("base64");
  }
}

const ts = `/**
 * Real brand logos for every connector — generated by scripts/gen-brand-logos.js.
 * SVG paths are official simple-icons artwork with brand hex colors.
 * Do not edit by hand; re-run the generator.
 */
export interface BrandLogo {
  /** SVG path data (24x24 viewBox). */
  path: string;
  /** Official brand color. */
  color: string;
  title?: string;
}

export const BRAND_LOGOS: Record<string, BrandLogo> = {
${entries}
};

/** Services with real favicon artwork (data URIs) — no binary push needed. */
export const BRAND_PNGS: Record<string, string> = ${JSON.stringify(pngData)};

/**
 * Full multicolor originals (Google G, Slack, Gmail…) — real brand artwork
 * with all original colors. Rendered via dangerouslySetInnerHTML from
 * vendored trusted files (never user input).
 */
export interface MulticolorLogo { viewBox: string; body: string; }
export const BRAND_MULTICOLOR: Record<string, MulticolorLogo> = ${JSON.stringify(multicolor)};
`;

fs.writeFileSync("src/lib/brand-logos.ts", ts);
console.log("wrote src/lib/brand-logos.ts");
