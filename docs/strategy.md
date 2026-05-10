# Greenscape Pro AI Strategy

**Prepared for:** License and Scale  
**Client:** Greenscape Pro, Phoenix AZ  
**Author:** Mohamed Elgazzar  
**Date:** 2026-05-10

Greenscape has two major revenue leaks.

The first is a pile of **1,400+ closed-lost leads** in GHL. Greenscape already paid Meta and Google to acquire those leads, but reactivation is sporadic.

The second is the **6-9 day proposal cycle**. Marcus loses 35-40% of qualified active leads to faster competitors.

Both matter. I would start with closed-lost reactivation because it is faster to deploy safely and has the bigger year-one pull: **about $784K latent revenue at a 2% reclose rate**.

## Top 5 AI Agents

### 1. Closed-Lost Reactivation Control Center

**Purpose:** Turn old GHL leads into reviewed, personalized follow-up opportunities.

**What it does:**
- Pulls closed-lost leads from GHL with project type, last notes, city, and reason lost.
- Generates a Marcus-style SMS, email, and phone call opener.
- Gives Marcus or Brittany an approval queue before anything goes out.
- Saves approved outreach to an outbox for future GHL or Twilio sending.
- Classifies replies as hot, warm, not interested, or manual review, then alerts the team on hot replies.

**Replaces:** Brittany's sporadic reactivation blasts and Marcus manually writing personal follow-ups.

**Estimated ROI:** 1,400 leads x 2% reclose x $28K average project value = **about $784K latent revenue**.

**Why #1:** It recovers demand Greenscape already paid for. It is also safer than automating active proposals first because cold leads have lower downside. If a message misses, it gets ignored. If an automated proposal is wrong, it can damage an active $50K deal.

### 2. AI Proposal Drafter

**Purpose:** Turn Marcus's site-walk notes into a proposal draft in minutes.

**What it does:**
- Extracts scope from Marcus's site-walk notes.
- Matches scope to the pricing catalog.
- Drafts the proposal narrative in Marcus's voice.
- Flags jobs over $30K for Carlos to create a 3D render.
- Keeps Marcus as the final reviewer before sending.

**Replaces:** Marcus personally drafting every proposal from scratch.

**Estimated ROI:** Shortening the proposal cycle from 6-9 days to under 24 hours could recover about **$420K/year** from speed-loss leads.

**Why #2:** This may be the deeper long-term bottleneck, but it depends on pricing accuracy, site-walk nuance, and a real proposal QA process. I would build it immediately after the reactivation system.

### 3. Post-Sign Drag Reducer

**Purpose:** Move signed customers through HOA, permit, deposit, and design-signoff steps faster.

**What it does:**
- Opens a tracker when a proposal is signed.
- Sends reminders for HOA submissions, deposits, permits, and design approvals.
- Alerts Jenna when a project is stuck.
- Gives Marcus visibility into what is blocking crew scheduling.

**Replaces:** Jenna manually chasing customers and Marcus manually tracking permit friction.

**Estimated ROI:** 8-12 projects sit in limbo at any time. At $28K average project value, that is **$224K-$336K of delayed revenue**.

**Why #3:** It does not create new demand, but it accelerates cash collection and crew utilization.

### 4. Project Comms Update Agent

**Purpose:** Keep customers informed during active builds without Marcus recording Looms manually.

**What it does:**
- Reads CompanyCam photos and Jobber milestones.
- Drafts customer-facing progress updates.
- Sends updates every few days during the build.
- Flags moments where a personal Marcus update would matter.

**Replaces:** Inconsistent project updates and daily "what is happening?" calls to Jenna.

**Estimated ROI:** Reduces support noise and improves referrals. Marcus already said customers love the personal updates when he sends them.

**Why #4:** High customer-experience leverage, but less direct revenue impact than #1-#3.

### 5. Approval Rule Book Agent

**Purpose:** Give Jenna Marcus's decision framework for small approvals.

**What it does:**
- Answers pricing, refund, change-order, and add-on questions.
- Uses Marcus's past decisions as the rule base.
- Escalates only when confidence is low or the amount is above threshold.

**Replaces:** 5-10 daily Slack pings to Marcus for small decisions.

**Estimated ROI:** Returns about **5-7 hours/week** of Marcus's attention.

**Why #5:** Useful and cheap to build, but smaller dollar impact than the revenue recovery agents.

## Why Closed-Lost First, Not Marcus's Stated #1?

Marcus said quoting is his top priority. I agree it is a major problem, and I rank it #2.

I would still start with closed-lost reactivation for three reasons:

1. **Bigger year-one pull:** about $784K latent revenue versus about $420K from quote-cycle recovery.
2. **Lower risk:** old leads are safer to test on than active customers waiting on proposals.
3. **Sunk CAC recovery:** Greenscape has already spent heavily on Meta and Google. This agent monetizes that past spend.

I would not build Marcus's stated #3 or #4 first.

Crew coaching matters, but the discovery math puts it around **$104K/year**, much smaller than the top two. Content also does not solve the current constraint. Marcus said lead volume is not the bottleneck. Quote capacity and follow-up are.

## Considered But Excluded

**Lead pre-qualification SMS or voice agent**

This would filter tire-kickers before Marcus calls them. I excluded it because the transcript only supports **1-2 hours/week saved**. It is useful later, but not top-5 ROI.

## Interdependencies

- Closed-lost reactivation creates second-chance opportunities.
- Proposal drafting helps close those opportunities faster once they re-engage.
- Post-sign drag and project comms share Jobber and CompanyCam plumbing.
- The approval rule book can be built independently.

## Assumptions

- Live GHL SMS/email sending is disabled in the P0 build because credentials and A2P compliance are not available today.
- Approved messages are saved to a Supabase outbox. A production GHL adapter can send them once credentials are ready.
- Reply classification is demonstrated through a simulated reply flow. In production, the same classifier would sit behind a GHL or Twilio inbound webhook.
- Marcus's tone is based on the brief and transcript. Historical messages would improve the voice further.
