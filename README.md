# Trove

AI workspace for real work: chat, websites, documents, spreadsheets, decks, research, code, agents, and team collaboration. Describe the work, refine in chat, export when ready.

**Live product:** [troveai.site](https://troveai.site) (or your deployed `SITE_URL`)

## The name

A **trove** is a stack of stones raised by travellers to mark a route — proof that someone came this way and left a sign for the next person. The product is meant to work the same way: you describe the work, Trove produces artefacts you can keep, revise, and come back to.

## What you get

| Area | What it does |
|------|----------------|
| **Chat** | One thread for the work — follow-ups refine the same artefact |
| **Docs / Sheets / Decks** | Documents, tables, and presentations you can export |
| **Design / Research / Code** | UI systems, researched answers, and runnable code |
| **Websites** | Sites you build and iterate in the workspace |
| **Agents** | Saved specialists with role and instructions |
| **Team** | Shared workspace, roles, projects, and a shared credit pool |

## Plans

- **Free** — enough monthly credits to try every solo tool
- **Pro** — higher daily capacity for individual work
- **Team** — shared capacity, invites, roles, and company context

See in-app **Plans** or `/pricing` for current numbers and the feature comparison.

## Stack

- Next.js (App Router) + TypeScript
- Deployed on Vercel
- Credits wrap real model token usage (nothing estimated ahead of time)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Required secrets depend on which providers you enable (AI, auth, billing). See `.env.example`.

## Routes (high level)

```
/                 marketing
/chat             workspace chat
/documents        docs
/spreadsheets     sheets
/slides           decks
/design           design
/websites         websites
/research         research
/agents           agents
/team             team workspace
/plans            billing & credits
/settings         account
```

## License

Private / proprietary unless otherwise stated in the repository.
