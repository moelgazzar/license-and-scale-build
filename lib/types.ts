export type LeadStatus =
  | 'new'
  | 'generated'
  | 'approved'
  | 'sent'
  | 'replied'
  | 'booked'
  | 'not_interested'
  | 'unreachable'
  | 'do_not_contact'
  | 'max_attempts_reached';

export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export type ReplyClassification = 'hot' | 'warm' | 'not_interested' | 'manual_review';

export type Channel = 'sms' | 'email' | 'call';

export type OutboxStatus = 'queued' | 'sent_simulated' | 'failed';

export interface ClosedLostLead {
  id: string;
  ghl_contact_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  zip: string | null;
  project_type: string | null;
  est_project_value: number | null;
  last_touchpoint_at: string | null;
  last_touchpoint_summary: string | null;
  reason_lost: string | null;
  notes: string | null;
  status: LeadStatus;
  attempt_count: number;
  last_status_change_at: string | null;
  created_at: string;
}

export interface OutreachDraft {
  id: string;
  lead_id: string;
  status: DraftStatus;
  sms_draft: string | null;
  email_subject: string | null;
  email_body: string | null;
  call_opener: string | null;
  rationale: string | null;
  model: string;
  generation_cost_usd: number | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  edits_made: boolean;
}

export interface OutboxMessage {
  id: string;
  draft_id: string;
  lead_id: string;
  channel: 'sms' | 'email';
  to_address: string;
  subject: string | null;
  body: string;
  status: OutboxStatus;
  dispatched_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface ReplyEvent {
  id: string;
  lead_id: string;
  channel: Channel;
  raw_text: string;
  classification: ReplyClassification;
  classification_reason: string | null;
  classification_cost_usd: number | null;
  model: string;
  notified_via_telegram: boolean;
  created_at: string;
}

export interface AppEvent {
  id: string;
  event_type: string;
  lead_id: string | null;
  draft_id: string | null;
  payload: unknown;
  created_at: string;
}
