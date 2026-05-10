-- License and Scale - Closed-Lost Reactivation Control Center
-- Supabase Postgres schema

create extension if not exists "pgcrypto";

-- closed_lost_leads: cold leads pulled from GHL (or seeded for the demo)
create table if not exists closed_lost_leads (
  id uuid primary key default gen_random_uuid(),
  ghl_contact_id text unique,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  city text,
  zip text,
  project_type text,
  est_project_value numeric,
  last_touchpoint_at timestamptz,
  last_touchpoint_summary text,
  reason_lost text,
  notes text,
  status text not null default 'new'
    check (status in (
      'new','generated','approved','sent','replied',
      'booked','not_interested','unreachable','do_not_contact','max_attempts_reached'
    )),
  attempt_count int not null default 0,
  last_status_change_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_leads_status on closed_lost_leads(status);
create index if not exists idx_leads_value on closed_lost_leads(est_project_value desc);

-- outreach_drafts: AI-generated multi-channel drafts
create table if not exists outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references closed_lost_leads(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','edited')),
  sms_draft text,
  email_subject text,
  email_body text,
  call_opener text,
  rationale text,
  model text not null,
  generation_cost_usd numeric,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  edits_made boolean default false
);

create index if not exists idx_drafts_lead on outreach_drafts(lead_id);
create index if not exists idx_drafts_status on outreach_drafts(status);

-- outbox_messages: approved messages awaiting GHL/Twilio dispatch (production hookup)
create table if not exists outbox_messages (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references outreach_drafts(id),
  lead_id uuid not null references closed_lost_leads(id),
  channel text not null check (channel in ('sms','email')),
  to_address text not null,
  subject text,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued','sent_simulated','failed')),
  dispatched_at timestamptz,
  failure_reason text,
  created_at timestamptz default now()
);

create index if not exists idx_outbox_status on outbox_messages(status);
create index if not exists idx_outbox_lead on outbox_messages(lead_id);

-- reply_events: inbound replies (real or simulated) and their classification
create table if not exists reply_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references closed_lost_leads(id),
  channel text not null check (channel in ('sms','email','call')),
  raw_text text not null,
  classification text not null
    check (classification in ('hot','warm','not_interested','manual_review')),
  classification_reason text,
  classification_cost_usd numeric,
  model text not null,
  notified_via_telegram boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_replies_lead on reply_events(lead_id);
create index if not exists idx_replies_classification on reply_events(classification);

-- app_events: lightweight audit log
create table if not exists app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  lead_id uuid references closed_lost_leads(id),
  draft_id uuid references outreach_drafts(id),
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_app_events_type on app_events(event_type);
create index if not exists idx_app_events_lead on app_events(lead_id);
