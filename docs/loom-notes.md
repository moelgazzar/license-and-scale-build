# Greenscape Pro Loom Notes

Use this as the screen-share guide. The strategy doc is the formal deliverable. This page is only for recording the walkthrough clearly.

## 0:00 to 0:45: Recommendation

My recommendation is to start with the **Closed-Lost Reactivation Control Center**.

The reason is simple:

1. Greenscape has **1,400+ closed-lost leads** sitting in GHL.
2. They already paid Meta and Google to acquire those leads.
3. Even a small reactivation rate creates meaningful revenue.

The math:

1,400 leads x 2% reclose x $28K average project value = **about $784K latent revenue**.

## 0:45 to 1:30: Top 3 Agents

### 1. Closed-Lost Reactivation Control Center

This reactivates old GHL leads with Marcus-style SMS, email, and call opener drafts.

Nothing sends automatically. Marcus or Brittany reviews and approves first.

### 2. AI Proposal Drafter

This turns Marcus's site-walk notes into a proposal draft in minutes instead of 6-9 days.

I still rank this very high because Marcus loses 35-40% of qualified leads to faster competitors.

### 3. Signed Project Follow-Up Agent

This is for after a customer says yes.

It keeps signed jobs from getting stuck because of deposits, permits, HOA approval, or design approval.

HOA means homeowners association. Some neighborhoods require approval before exterior work can start.

## 1:30 to 2:00: Why Closed-Lost First

Marcus said quoting is his top priority. I agree quoting is a major bottleneck, and I rank it second.

I would still start with closed-lost reactivation for three reasons:

1. **Bigger year-one pull:** about $784K from closed-lost versus about $420K from quote-cycle recovery.
2. **Lower risk:** old leads are safer to test on than active customers waiting on proposals.
3. **Sunk CAC recovery:** Greenscape already paid for these leads through Meta and Google.

The key point:

I am not saying quoting is unimportant. I am saying closed-lost reactivation should go first because it is safer, faster to deploy, and recovers paid-for demand immediately.

## 2:00 to 3:30: Demo Flow

### Step 1: Dashboard

Open the production URL:

https://license-and-scale-build.vercel.app

Show:

- New closed-lost leads.
- Lead value.
- Top action button.
- Human approval framing.

### Step 2: Generate drafts

Click **Generate top 3 high-value drafts**.

Explain:

The AI generates a personalized SMS, email, and call opener for each lead.

### Step 3: Review queue

Open the approval queue.

Show one draft and say:

This is the human-in-the-loop step. The AI drafts, but Marcus or Brittany controls what goes out.

### Step 4: Approve

Click approve on one draft.

Explain:

Approval creates real outbox rows in Supabase. In production, the GHL adapter would send from this outbox.

Show the Telegram notification on your phone if possible.

### Step 5: Outbox

Open the outbox page.

Explain:

This is the safety layer. Messages are queued and auditable instead of being sent directly from the LLM.

### Step 6: Simulate hot reply

Open the simulate reply flow.

Paste a hot reply like:

> Yes, still interested. Can Marcus call me tomorrow morning?

Explain:

In production, this would come from a GHL or Twilio inbound webhook. The classifier labels it hot and alerts the team.

## 3:30 to 4:30: Architecture

The build is a real coded app, not a no-code workflow.

Architecture:

- **Next.js on Vercel** for the app.
- **Supabase Postgres** for leads, drafts, outbox messages, replies, and audit events.
- **OpenAI** for personalized draft generation and reply classification.
- **Zod validation** so LLM output has to match the expected structure.
- **Telegram Bot API** for external team notifications.
- **Outbox pattern** so no customer-facing message sends directly from the LLM.

Why no live GHL sending today:

GHL SMS needs credentials and A2P compliance. That is not realistic inside a 24-hour take-home.

The production adapter is still straightforward:

Approved Supabase outbox message goes to GHL when `GHL_SEND_ENABLED=true`.

## 4:30 to 5:00: What I Would Build Next

Next steps:

1. Wire the real GHL send adapter behind the existing outbox.
2. Add inbound GHL or Twilio reply webhooks.
3. Build the AI Proposal Drafter as agent #2.
4. Build Signed Project Follow-Up as agent #3.
5. Add historical Marcus messages to improve tone.

Closing line:

This P0 is intentionally narrow. It proves the highest-ROI workflow with real storage, real LLM calls, real approval logic, and a real external notification channel.
