---
name: composio
description: Route and complete Composio work across Composio For You and Composio Platform. Use when the user mentions Composio; wants an agent to use apps such as Gmail, Slack, GitHub, Notion, Calendar, or Linear; needs first-time setup, an SDK or MCP integration, CLI operation, migration guidance, current documentation, or help diagnosing a connection or tool call.
---

# Composio

Use this skill as a router. Identify the product and the job, load only the relevant guidance, consult canonical documentation for volatile details, and then answer or do the work the user requested.

## 1. Choose the product

Do not blend the products. They use different credentials and setup paths.

| | Composio For You | Composio Platform |
|---|---|---|
| Use when | Someone wants their own agent to use their own apps | A developer is building a product whose users connect accounts |
| Primary surface | MCP or the Composio CLI | SDK sessions inside an application |
| Credential | `ck_...` consumer key when the client requires a header | `COMPOSIO_API_KEY` project key |
| Dashboard | `dashboard.composio.dev` → For You | `dashboard.composio.dev` → Platform |

Treat an application codebase, SDK, user or tenant identity, backend, or product agent as **Platform**.

## 2. Trove integration

Trove uses **Composio Platform** with per-user sessions:

- Env: `COMPOSIO_API_KEY`
- Client: `src/lib/composio.ts`
- APIs:
  - `POST /api/composio/session` — create or resume session
  - `POST /api/composio/authorize` — Connect Link for a toolkit
  - `POST /api/composio/execute` — run a tool slug

User id for Composio is the Trove `users.id`.

## 3. Canonical docs

```text
https://docs.composio.dev/llms.txt
https://docs.composio.dev/docs/quickstart.md
https://docs.composio.dev/docs/how-composio-works.md
```

Prefer current API reference over legacy Tool Router naming. Sessions replaced Tool Router.
