# Trove

AI workspace for real work: chat, websites, documents, spreadsheets, decks, research, code, agents, and team collaboration. Describe the work, refine in chat, publish or export when ready.

**Live product:** [troveai.site](https://troveai.site) (or your deployed `SITE_URL`)

## The name

A **trove** is a stack of stones raised by travellers to mark a route — proof that someone came this way, and a guide for whoever comes next. Your chats, documents, sites, and agents pile up into something that persists and marks the way back.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** — tokens in `src/app/globals.css`
- **libSQL / Turso** — local SQLite in development, Turso in production
- **Models** — Gemini and optional OpenAI-compatible gateways (Experiential Labs, OpenRouter, xAI, etc.)
- **Billing** — Stripe and/or Lemon Squeezy (Pro + Team, monthly/yearly)
- **Integrations** — **Composio** for one-click OAuth (Gmail, Slack, GitHub, Notion, …); personal tokens still work for some tools
- **react-icons** — iconography; motion is CSS / inline SVG (no animation library)

## Setup

```bash
cp .env.example .env.local
# Required for AI:
#   GEMINI_API_KEY=...
# Optional but required for durable production data:
#   TURSO_DATABASE_URL=...
#   TURSO_AUTH_TOKEN=...
# Optional billing:
#   STRIPE_* or LEMONSQUEEZY_*
# Optional tool OAuth:
#   COMPOSIO_API_KEY=...   # from dashboard.composio.dev → Platform

npm install
npm run dev
```

Server-only secrets never reach the browser. See `.env.example` for the full list.

## What works in the live app

| Area | Status |
| --- | --- |
| Chat + saved conversations | Working — threads persist and reopen from `?c=<id>` |
| Documents / sheets / slides / research / code | Working — export to real `.docx` / `.xlsx` where applicable |
| Websites & builder | Working (product surface; deploy via your host settings) |
| Agents | Working — agents persist; instructions feed the system prompt |
| Team workspaces | Working — invites, roles, **seat limits** (5 free seats; extra seats via packages) |
| Plans & billing | **Free, Pro, Team** — checkout via Stripe and/or Lemon Squeezy when env prices/variants are set |
| Credits | Metered from model usage (1 credit ≈ 1,000 tokens) + rolling 5-hour window |
| Integrations / Plugins | **Composio** one-click OAuth for major apps; token paste for GitHub, Slack, Notion, etc. |
| Connect tools UI | Same “Connect your tools” card on **chat home**, **landing**, and link to `/integrations` |
| Nango | **Removed** — do not set `NANGO_*`; use Composio instead |

### Pricing (product)

| Plan | Monthly credits | ≈ tokens | Price (USD) |
| --- | --- | --- | --- |
| **Free** | 200 | ~200k | $0 |
| **Pro** | 5,000 | ~5M | $19/mo or $200/yr |
| **Team** | 20,000 shared | ~20M | $99/mo or $1,100/yr |

Pro/Team also include higher 5-hour burst windows, publish on `*.troveai.site` (Pro+), and Team adds shared workspace, invites, and a shared credit pool. Exact UI copy lives in `src/lib/credits.ts` and the plans page.

Checkout needs the matching Stripe price IDs and/or Lemon Squeezy variant IDs in env. Without them, the app still runs; paid upgrade buttons will not complete payment.

### Integrations (Composio)

1. Create a project at [dashboard.composio.dev](https://dashboard.composio.dev) → **Platform**
2. Set `COMPOSIO_API_KEY` in Vercel / `.env.local`
3. Redeploy
4. Open **Plugins** (`/integrations`) or use **Connect all tools** from chat/landing

APIs: `POST /api/composio/authorize`, `POST /api/composio/sync`, `POST /api/composio/session`, `POST /api/composio/execute`, `GET /api/composio/verify`.

Some toolkits (e.g. X/Twitter) need a **custom auth config** in the Composio dashboard and are not enabled for managed OAuth by default.

## Credits

- **1 credit = 1,000 tokens** reported by the model (prompt + completion), minimum 1 credit per call
- Monthly grant by plan + **rolling 5-hour window** (see `RATE_WINDOW_MS` / plan `windowLimit`)
- Balance checked **before** the model call; spend recorded **after** from real usage
- Exhausted balance → **402** with a clear message (no wasted provider quota)
- Admin emails (`ADMIN_EMAIL` / `ADMIN_EMAILS`) can be unlimited

## Main routes

```
/                 marketing landing (signed-in users redirect to /chat)
/chat             chat home
/dashboard        account overview
/websites         website builder
/agents           agents
/team             team workspace & seats
/documents        docs → .docx
/spreadsheets     sheets → .xlsx
/slides           decks
/research         research
/integrations     plugins (Composio + tokens)
/plans            pricing & upgrade
/settings         account settings
/login  /signup
```

## Deploying

| Host | Notes |
| --- | --- |
| **Vercel / Netlify / similar** | Set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — serverless disk is not durable |
| **VPS / Docker with a volume** | Local SQLite under `TROVE_DATA_DIR` works |
| **Static-only hosts** | Not supported (API routes, auth, DB) |

```bash
curl https://your-app.example/api/health
```

Health reports DB mode and whether required env vars are present (booleans only).

### Production checklist

- `SITE_URL` or `NEXT_PUBLIC_SITE_URL` — canonical URLs, sitemap, OG
- `TURSO_*` — durable auth, credits, conversations
- `GEMINI_API_KEY` (and optional secondary model keys)
- `COMPOSIO_API_KEY` — one-click tool OAuth
- `STRIPE_*` and/or `LEMONSQUEEZY_*` — paid plans
- `TROVE_SECRET` — encrypt stored personal tokens
- Node **≥ 24** (`engines` in `package.json`)

### Docker

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com -t trove .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=... \
  -e COMPOSIO_API_KEY=... \
  -v trove-data:/data \
  trove
```

Mount a volume at `/data` (or set `TROVE_DATA_DIR`) so accounts and threads survive restarts.

## Development notes

```bash
npm run dev      # development
npm run serve    # production build + start locally
npm run build
```

Prefer `npm run serve` when measuring performance — `next dev` is much slower.

## Design

Light / dark / system themes (sidebar control). Tokens live in `src/app/globals.css`. Elevation ramps reverse between themes so “raised” always means step-away-from-the-page.

## License / trademark

Product and branding are owned by the Trove operators. This repository’s license, if any, is whatever is declared in the repo root; trademark and domain availability are the operator’s responsibility.
