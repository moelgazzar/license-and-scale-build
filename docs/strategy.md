# Greenscape Pro - AI Strategy

**Prepared for:** License and Scale | **Client:** Greenscape Pro, Phoenix AZ | **Author:** Mohamed Elgazzar | **Date:** 2026-05-10

Greenscape sits on **two seams of revenue leakage** that dwarf everything else in the audit. The first is a pile of **1,400+ closed-lost leads in GHL** that Greenscape has already paid Meta and Google to acquire, sitting cold with sporadic re-engagement. The second is a **6-9 day proposal cycle** that loses 35-40% of qualified active leads to faster competitors. Year-one math says the closed-lost pile is the bigger pull (~$784K latent at 2% reclose vs ~$420K from a 33% close-rate lift on active leads). Both are mandatory builds; the order is Closed-Lost first, then Proposal Drafter.

---

## Top 5 AI Agents (by ROI and leverage)

### 1. Closed-Lost Reactivation Control Center
**Purpose:** Personal-feeling, Marcus-voice re-engagement of the 1,400+ closed-lost leads in GHL — drafted, approved, and tracked through a state machine.
- Pulls cold leads from GHL with last-touchpoint context, project type, and geography.
- Generates SMS + email + call-opener drafts in Marcus's voice using a typed LLM call.
- Marcus reviews a daily approval queue (approve / reject / edit), nothing auto-sends.
- Approved messages flow to a Supabase `outbox` for GHL or Twilio dispatch; reply classifier (hot / warm / not interested / opt-out) updates lead status and pings Marcus on hot replies via Telegram.
- State machine (New → Generated → Approved → Sent → Replied → Booked / Not Interested / Unreachable / Do Not Contact) with attempt cap and optimistic locking — same pattern as my Air Tech membership renewal agent in production.

**Replaces:** Brittany's sporadic mass blasts; eliminates Marcus drafting personal outreach by hand.
**ROI:** 1,400 leads × 2% reclose × $28K avg = **~$784K latent year-1 revenue**, near-zero marginal acquisition cost (CAC already paid through Meta + Google over 3 years).
**Why #1:** Largest immediate dollar pull. Cold leads carry no in-flight customer expectations, so the failure mode is "ignored," not "broken proposal sent to a $50K customer." It also harvests sunk CAC — Greenscape is spending $25-30K/month on paid acquisition; this agent compounds that spend retroactively.

### 2. AI Proposal Drafter (Quote Cycle Compressor)
**Purpose:** Turn Marcus's site-walk notes into a Marcus-voice draft proposal in minutes, not days.
- Marcus dictates or types site-walk notes; LLM extracts scope and matches line items against the pricing catalog.
- Total auto-calculated server-side from line items, never from the LLM, to prevent hallucinated math.
- Marcus reviews/edits/approves; Stripe deposit link + customer email + Slack ping fire on approval.
- 3D render request auto-flagged for jobs over $30K (handoff to Carlos).

**Replaces:** The 6-9 day Marcus-only proposal drafting bottleneck.
**ROI:** Compressing the cycle from 6-9 days to <24 hours converts ~33% of the speed-loss qualified leads. ~150 active projects × 30% close × 33% lift × $28K = **~$420K/year recurring**, compounding across all future years as long as paid acquisition keeps feeding the funnel.
**Why #2 not #1:** Long-run this is the structurally bigger play — Closed-Lost is a one-time harvest, Proposal Drafter is annual recurring revenue. We sequence it #2 because the Closed-Lost agent ships safer in production (no real-time site-walk dependency, no pricing-spreadsheet integration, no in-flight customer risk) and pulls bigger year-one cash. Once a closed-lost lead re-engages, the Proposal Drafter is what closes them faster — the two stack.

### 3. Post-Sign Drag Reducer
**Purpose:** Automated nudges and status tracking for HOA submissions, permit revisions, and deposit collection.
- Triggers on contract signed; opens a tracker per project.
- Sends customer-side reminders for HOA package submission, deposit payment, and design sign-off on a configurable cadence.
- Pings Jenna in Slack when a project hits a stale threshold (HOA package not submitted in 5 days, deposit unpaid for 3 days).
- Logs every milestone for crew scheduling visibility.

**Replaces:** Jenna's manual chase work; partially replaces Marcus's permit follow-through.
**ROI:** 8-12 projects in limbo at $28K avg = **$224-336K of delayed revenue at any moment**. Compressing limbo by 1-2 weeks per project unlocks crew scheduling and pulls cash forward.
**Why #3:** Operational, not revenue-creating, but accelerates cash velocity and crew utilization. Lower LLM-leverage than #1-#2; primarily a state-machine + scheduled-nudge play.

### 4. Project Comms Update Agent
**Purpose:** Automated, Marcus-branded customer updates triggered by CompanyCam photo uploads and Jobber milestones.
- Listens for new CompanyCam photo batches + Jobber daily check-ins.
- LLM drafts a 1-paragraph customer-facing update referencing what happened on site that day.
- Sends every 2-3 days during active build, more frequently at milestones (demo done, base poured, planting in).
- Optional: stitches a 30-second Loom-style auto-narrated update at the halfway point.

**Replaces:** Marcus's manual halfway-point Looms (only happen on 30% of jobs); reduces inbound "what is happening?" calls to Jenna.
**ROI:** Eliminates daily inbound noise to Jenna; drives referral velocity (Marcus said: "you are the only contractor who kept us informed" wins referrals). Estimated 1-3 extra referral-driven projects per year.
**Why #4:** Soft revenue but high client-experience leverage. Lower priority than #1-#3 because it does not create or recover revenue directly.

### 5. Approval Rule Book Agent
**Purpose:** Codify Marcus's pricing and approval framework into a Slack bot Jenna can query before pinging Marcus.
- Trained on Marcus's historical change-order, refund, and add-on decisions.
- Jenna asks in Slack: "Customer wants extra pallet of stone, what do I charge?" → bot returns Marcus's framework answer with citation.
- Escalates to Marcus only when answer confidence is low or deal value exceeds a threshold.

**Replaces:** 5-10 daily Slack pings from Jenna to Marcus on small approvals.
**ROI:** Returns ~5-7 hours/week of Marcus's attention. Jenna self-serves on ~70% of small approvals after 2-3 months of training data.
**Why #5:** Smallest dollar impact but cheapest to build and directly addresses Marcus's stated "I want my evenings back" pain. A quality-of-life unlock, not a revenue unlock.

---

## Why #1 (Closed-Lost), not Marcus's stated #1?

Marcus's stated #1 is **quoting**, and we still rank it as a top-2 problem (it is #2 here). We rank Closed-Lost above it because the math, the risk profile, and the build sequencing all favor it for year-one. **Year-one dollar pull:** ~$784K vs ~$420K. **Risk:** cold leads have no in-flight expectations; a bad proposal sent on an active lead can torch a $50K deal. **CAC recapture:** Greenscape has already spent over $750K on Meta + Google over three years; reclosing the closed-lost pile is reclaiming sunk cost. **Sequencing:** once Closed-Lost re-engages a lead, the Proposal Drafter closes it faster — the two agents compound, but #1 must come first to feed #2.

We also drop Marcus's stated **#3 (crew coaching)** and **#4 (content/marketing)** entirely. Crew coaching is real money (~$104K/year) but an order of magnitude smaller than #1-#2; the auditor explicitly flagged it as a "candidate trap" if priorities are not reasoned from data. Content is a non-problem — Marcus admitted on the call that lead volume is not the bottleneck, ROAS on Meta is healthy at 4-4.5x, and quote capacity is the constraint. Building a content agent solves a problem Greenscape does not have.

## Considered but not in top 5: Lead Pre-Qualification Agent

A SMS/voice qualifier that filters tire-kickers before they hit Marcus's calendar. Excluded because the math is small (1-2 hours/week saved) and Marcus himself admitted quote capacity, not lead volume, is the constraint. Filtering more leads does not create more capacity to quote them; the Proposal Drafter does. Pre-qual is a phase-2 polish, not a top-5 ROI play.

## Interdependencies

- **#1 → #2:** When closed-lost leads re-engage, the Proposal Drafter is what closes them faster. The two agents stack: #1 generates the second-chance opportunities, #2 converts them quickly enough to keep them.
- **#3 + #4:** Both share the Jobber + CompanyCam webhook plumbing. Build #3 first because it has direct $ impact; #4 is mostly UX layered on top.
- **#5 is independent** and can be built in parallel.

## Assumption Disclosures

- **GHL access:** Live GHL SMS/email send is disabled in the P0 build today due to A2P compliance and credential turnaround. Approved messages flow to a Supabase `outbox` table; the production GHL adapter is documented and is roughly a 1-2 hour follow-on once credentials and an A2P-registered short code are in place.
- **Reply ingestion:** P0 demonstrates reply classification via a "Simulate Reply" admin flow. Production wires the same classifier to a GHL or Twilio inbound webhook.
- **Marcus's voice:** P0 uses a single Marcus-voice style guide compiled from the brief and the discovery transcript. With 5-10 historical Marcus-written re-engagement messages, the tone tightens further (few-shot at runtime).
- **Pricing catalog (for #2 Proposal Drafter when built):** assumed Marcus's 200-line spreadsheet is exportable to Postgres or kept live via Sheets API.
