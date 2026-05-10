# Greenscape Pro - Closed-Lost Reactivation Control Center

Internal tool that re-engages closed-lost leads from GHL with personalized, Marcus-voice SMS / email / call drafts. Built for the License and Scale AI Implementation Specialist take-home (Mohamed Elgazzar, May 2026).

> **Strategy document:** [`docs/strategy.md`](./docs/strategy.md) - 2-page ranking of the top 5 AI agents for Greenscape Pro with explicit pushback on the founder's stated priorities. The P0 build is what this repo contains.
>
> **Live deployment:** https://license-and-scale-build.vercel.app

## What it does

1. Pulls 1,400+ closed-lost leads from a Postgres source-of-truth (in production: synced from GHL).
2. For a selected batch of leads, calls OpenAI to generate four assets per lead: an SMS draft, an email subject + body, a call opener, and a recommended-next-action rationale.
3. Sends drafts to a human-in-the-loop approval queue. Marcus can approve, reject, or edit each draft.
4. Approved drafts queue to a Supabase `outbox_messages` table, ready for production GHL/Twilio dispatch behind the `GHL_SEND_ENABLED` flag.
5. Telegram alerts ping internally on approvals and on hot replies.
6. Customer replies (real in production via GHL/Twilio webhook; simulated in this build via the Simulate Reply page) are classified by OpenAI as hot / warm / not interested / manual review and update the lead status.
7. Every event is logged to `app_events` for audit.

## Tech stack

- **Next.js 16** (App Router, Server Actions, Server Components)
- **TypeScript**, **Tailwind CSS v4**
- **Supabase** Postgres (persistent business data only - never API keys)
- **OpenAI** (`gpt-4.1-mini`, falls back to `gpt-4o-mini` automatically if the configured model is unavailable)
- **Telegram Bot API** for internal notifications (no SDK; plain `fetch`)
- **Zod** for LLM output schema validation, with one-shot retry

## Why this stack

- **Next.js + Vercel** is the fastest path from zero to a public URL with a real backend.
- **Supabase Postgres** gives us a real database with strong typing and a clean JS client. Free tier covers the demo. RLS deliberately not enabled because this is a single-tenant internal tool that always runs server-side with the service role.
- **OpenAI** because the take-home requires a real LLM call. `gpt-4.1-mini` keeps cost under $0.01 per draft and per classification while producing usable Marcus-voice output. The fallback to `gpt-4o-mini` is automatic.
- **Telegram** because GHL SMS is disabled in this build (see "What is NOT in this build") and Telegram gives us a real, working external integration without A2P registration risk.

## What is NOT in this build (and why)

- **Live GHL SMS / email send.** Disabled because A2P 10DLC compliance and credential rotation are not solvable inside the take-home window. Approved messages flow to the `outbox_messages` table and a "Simulate dispatch" button toggles state. The production hookup is documented below.
- **Gmail OAuth.** Same reasoning - OAuth setup with consent screens is out of scope. Email goes to the same outbox.
- **Real inbound reply webhook.** Replies are simulated via the Simulate Reply page; in production this would be a GHL or Twilio inbound webhook posting to a route that calls `classifySimulatedReply`.
- **Multi-user RLS / auth.** This is an internal tool. Add Supabase auth + RLS when extending to multiple Greenscape staff users.

## Architecture

```
Postgres (closed_lost_leads)
       v select batch
Marcus dashboard (/) - multi-select form
       v Server Action: generateDraftsForLeads
OpenAI (parallel, concurrency=5) - structured JSON output, Zod validated
       v persist to outreach_drafts (status: pending)
Approval queue (/queue) - approve / reject / edit
       v Server Action: approveDraft
Insert outbox_messages (status: queued)  +  Telegram ping
       v Simulate dispatch
outbox_messages (status: sent_simulated)  +  lead status: sent

Customer replies (simulated in /replies/simulate)
       v Server Action: classifySimulatedReply
OpenAI classifier (Zod validated)
       v persist reply_events  +  update lead status
       v if classification === 'hot': fire Telegram alert
```

Audit log: every meaningful action writes to `app_events` (`batch_generated`, `draft_approved`, `draft_rejected`, `message_outboxed`, `reply_classified`, `telegram_sent`, `error`).

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd license-and-scale-build
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings > API > service_role (server-only) |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `OPENAI_MODEL` | `gpt-4.1-mini` (recommended) or `gpt-4o-mini` |
| `TELEGRAM_BOT_TOKEN` | message @BotFather on Telegram, `/newbot` |
| `TELEGRAM_CHAT_ID` | message your bot once, then GET `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local; your Vercel URL for prod |

**Secrets rule:** API keys live in `.env.local` (local) and Vercel env vars (prod). They are never stored in Supabase. Supabase only holds business data: leads, drafts, approvals, outbox, replies, audit events.

### 3. Apply the Supabase schema and seed

In the Supabase SQL editor (or `psql`):

1. Paste contents of `supabase/schema.sql`, run.
2. Paste contents of `supabase/seed.sql`, run.

Or with `psql`:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

### 5. Demo flow

1. **Dashboard** - select 3-5 high-value leads (e.g. Lina Hartmann, Linnea Vasquez, Marcus Bell, Sasha Greene), click "Generate drafts for selected." You'll be redirected to the queue.
2. **Approval queue** - review drafts, edit if you want, click "Approve & queue to outbox." Telegram pings on approval.
3. **Outbox** - approved messages appear here. Click "Simulate dispatch" to mark as sent and update lead status.
4. **Simulate Reply** - pick a sent lead, paste a reply (sample replies provided), click "Classify." Hot replies fire a Telegram alert.
5. **Replies feed** - see all classifications.
6. **Lead detail** - click any lead name for the full timeline.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel > New Project > import this repo.
3. Add the env vars from `.env.local` to Vercel project settings (Settings > Environment Variables).
4. Deploy.
5. Smoke test: dashboard loads, generate drafts on 1-2 leads, approve, simulate dispatch, simulate a reply.

## Production GHL hookup (next ~2 hours of work)

In `app/actions.ts > dispatchOutboxMessage`, the simulated dispatch is a status flip. To wire production GHL SMS:

```ts
if (process.env.GHL_SEND_ENABLED === 'true') {
  // GHL Conversations API: POST https://services.leadconnectorhq.com/conversations/messages
  // Body: { type: 'SMS' | 'Email', contactId, message, ... }
  // Auth: Bearer GHL_API_KEY
  await sendViaGhl({ ... });
}
```

The same applies to email - swap the simulation for the GHL email-send endpoint or a Resend/SendGrid call. Reply ingestion replaces `classifySimulatedReply` with a `/api/replies/inbound` route handler verifying a GHL or Twilio webhook signature.

## Cost considerations

- **Draft generation:** ~$0.003-0.008 per lead with `gpt-4.1-mini` (~1.5K input + ~400 output tokens).
- **Reply classification:** ~$0.001-0.002 per reply.
- 100-lead daily batch: under $1 in OpenAI cost.

Per-call cost is logged on every `outreach_drafts` and `reply_events` row, surfaced in the UI.

## Guardrails

- All LLM outputs validated by Zod schemas. One retry on parse failure with a stricter instruction. Errors land in `app_events`.
- Service role key never reaches the browser - all writes go through Server Actions running server-side only.
- Approved messages cannot reach a customer in this build because outbox dispatch is simulated. The `GHL_SEND_ENABLED` flag is the only path to live send and defaults to `false`.
- Idempotent operations: re-approving an already-approved draft is a no-op; re-dispatching an already-dispatched outbox row is a no-op.
- Attempt cap: leads max out at 3 attempts before landing in `max_attempts_reached`.

## File layout

```
app/
  page.tsx                 -- dashboard
  queue/page.tsx           -- approval queue
  outbox/page.tsx          -- queued + sent_simulated outbox
  replies/page.tsx         -- classified replies feed
  replies/simulate/page.tsx -- paste-a-reply admin
  leads/[id]/page.tsx      -- per-lead timeline
  actions.ts               -- all server actions
  layout.tsx               -- app shell + nav
  globals.css              -- Tailwind v4 + status badges
lib/
  supabase.ts              -- server + anon clients
  openai.ts                -- generateDraft + classifyReply
  telegram.ts              -- bot send helper
  schemas.ts               -- Zod schemas
  types.ts                 -- shared TS types
  voice-guide.ts           -- Marcus voice style guide
supabase/
  schema.sql               -- DDL (5 tables)
  seed.sql                 -- 25 realistic Greenscape closed-lost leads
```

## License

Internal / take-home submission. Not for redistribution.
