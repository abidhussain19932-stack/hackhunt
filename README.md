# HackHunt

**An Agent-Native app where an AI agent scouts hackathons and bounties, scores how well each one fits you, and turns the rules into a deadline-aware submission checklist that you edit on a board.**

Built for the [Builder.io Agent-Native Hackathon](https://www.builder.io/hackathon) (Oct 27 – Nov 9, 2026).

> Work in progress. Status: data model and actions done; board UI, agent prompt, and deploy in progress.

## Why

Indie builders juggle a dozen hackathons at once: each with its own timezone, prize, eligibility fine print, and submission form. Missing one field or misreading "11:59 PM PT" costs the entry. HackHunt lets the agent do the reading and the bookkeeping while you stay in control of what to pursue.

## How it works

One set of typed actions (`actions/`) powers the board UI, the chat agent, HTTP, CLI, and MCP:

| Action | What it does |
| --- | --- |
| `read-page` | Fetch a public listing/rules page; return text plus every date and dollar amount it mentions |
| `save-opportunities` | Batch-add opportunities (deduped by URL) with a submission checklist |
| `list-opportunities` | Board data, soonest deadline first, with checklist progress |
| `get-opportunity` | One opportunity with notes and checklist |
| `update-opportunity` | Move columns, edit prize/deadline/fit/notes |
| `add-checklist-items` / `update-checklist-item` | Grow and tick the checklist |
| `delete-opportunity` | Remove from the board |

Deadlines are stored as UTC and shown in your local timezone with a countdown.

## Run locally

```bash
pnpm install
pnpm dev
```

Choose **Continue as local dev**. Connect an LLM (Builder.io, or a provider key such as Groq/OpenAI/Anthropic in `.env`).

CLI example:

```bash
AGENT_USER_EMAIL=local@localhost pnpm action read-page --url https://www.builder.io/hackathon/rules
```

## Pre-existing work

Scaffolded from the official Agent-Native Chat template (`npx @agent-native/core@0.223.0 create --standalone --template chat`). Everything under `actions/` except `hello`, `navigate`, `view-screen`, `provider-api-request`, `run`; `server/db/`, `server/lib/`, `server/plugins/db.ts`; and the board routes were written during the hackathon (from Nov 3, 2026).

## License

MIT © 2026 Abid Hussain
