'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase';
import { generateDraft, classifyReply } from '@/lib/openai';
import { sendTelegram } from '@/lib/telegram';
import type {
  ClosedLostLead,
  LeadStatus,
  ReplyClassification,
} from '@/lib/types';

const MAX_ATTEMPTS = 3;
const GENERATION_CONCURRENCY = 5;

async function logEvent(opts: {
  event_type: string;
  lead_id?: string | null;
  draft_id?: string | null;
  payload?: unknown;
}) {
  const supabase = getServerClient();
  await supabase.from('app_events').insert({
    event_type: opts.event_type,
    lead_id: opts.lead_id ?? null,
    draft_id: opts.draft_id ?? null,
    payload: (opts.payload ?? null) as never,
  });
}

async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        const value = await fn(items[idx]);
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function generateDraftsForLeads(leadIds: string[]): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  if (!leadIds.length) {
    return { generated: 0, failed: 0, errors: ['No leads selected'] };
  }
  const supabase = getServerClient();

  const { data: leads, error } = await supabase
    .from('closed_lost_leads')
    .select('*')
    .in('id', leadIds);

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  if (!leads || !leads.length) {
    return { generated: 0, failed: 0, errors: ['No matching leads'] };
  }

  const eligible = (leads as ClosedLostLead[]).filter((l) => l.attempt_count < MAX_ATTEMPTS && l.status !== 'do_not_contact');
  const results = await pMap(eligible, GENERATION_CONCURRENCY, async (lead) => {
    const { payload, cost, model } = await generateDraft(lead);
    const { data: inserted, error: insertError } = await supabase
      .from('outreach_drafts')
      .insert({
        lead_id: lead.id,
        status: 'pending',
        sms_draft: payload.sms_draft,
        email_subject: payload.email_subject,
        email_body: payload.email_body,
        call_opener: payload.call_opener,
        rationale: payload.rationale,
        model,
        generation_cost_usd: cost,
      })
      .select('id')
      .single();
    if (insertError) throw new Error(`Insert failed for lead ${lead.id}: ${insertError.message}`);
    await supabase
      .from('closed_lost_leads')
      .update({ status: 'generated', last_status_change_at: new Date().toISOString() })
      .eq('id', lead.id)
      .in('status', ['new', 'generated', 'sent', 'replied']);
    await logEvent({
      event_type: 'batch_generated',
      lead_id: lead.id,
      draft_id: inserted?.id ?? null,
      payload: { model, cost },
    });
    return inserted?.id;
  });

  const generated = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
    .slice(0, 5);

  if (failed > 0) {
    await logEvent({ event_type: 'error', payload: { source: 'generate', failed, errors } });
  }

  revalidatePath('/');
  revalidatePath('/queue');
  return { generated, failed, errors };
}

export async function generateDraftsForm(formData: FormData) {
  const ids = formData.getAll('leadId').map((v) => String(v));
  await generateDraftsForLeads(ids);
  redirect('/queue');
}

export async function approveDraft(draftId: string): Promise<void> {
  const supabase = getServerClient();
  const { data: draft, error: draftErr } = await supabase
    .from('outreach_drafts')
    .select('*')
    .eq('id', draftId)
    .single();
  if (draftErr || !draft) throw new Error(`Draft not found: ${draftErr?.message ?? draftId}`);
  if (draft.status === 'approved') {
    return; // idempotent
  }

  const { data: lead, error: leadErr } = await supabase
    .from('closed_lost_leads')
    .select('*')
    .eq('id', draft.lead_id)
    .single();
  if (leadErr || !lead) throw new Error(`Lead not found for draft: ${leadErr?.message ?? draft.lead_id}`);

  const now = new Date().toISOString();
  const outboxRows: Array<Record<string, unknown>> = [];
  if (lead.phone && draft.sms_draft) {
    outboxRows.push({
      draft_id: draft.id,
      lead_id: lead.id,
      channel: 'sms',
      to_address: lead.phone,
      subject: null,
      body: draft.sms_draft,
      status: 'queued',
    });
  }
  if (lead.email && draft.email_body && draft.email_subject) {
    outboxRows.push({
      draft_id: draft.id,
      lead_id: lead.id,
      channel: 'email',
      to_address: lead.email,
      subject: draft.email_subject,
      body: draft.email_body,
      status: 'queued',
    });
  }

  if (outboxRows.length) {
    const { error: outboxErr } = await supabase.from('outbox_messages').insert(outboxRows);
    if (outboxErr) throw new Error(`Outbox insert failed: ${outboxErr.message}`);
  }

  await supabase
    .from('outreach_drafts')
    .update({ status: 'approved', reviewed_at: now })
    .eq('id', draft.id);

  await supabase
    .from('closed_lost_leads')
    .update({
      status: 'approved' as LeadStatus,
      attempt_count: lead.attempt_count + 1,
      last_status_change_at: now,
    })
    .eq('id', lead.id);

  await logEvent({
    event_type: 'draft_approved',
    lead_id: lead.id,
    draft_id: draft.id,
    payload: { outbox_count: outboxRows.length },
  });

  const projectRef = lead.project_type ? ` (${lead.project_type})` : '';
  const channels = outboxRows.map((r) => r.channel).join(', ');
  const tg = await sendTelegram(
    `*Approved*: ${lead.first_name} ${lead.last_name ?? ''}${projectRef}\nQueued ${outboxRows.length} message${outboxRows.length === 1 ? '' : 's'} (${channels || 'no channels available'}) to outbox.`,
  );
  if (tg.ok) {
    await logEvent({ event_type: 'telegram_sent', lead_id: lead.id, draft_id: draft.id, payload: { kind: 'approval' } });
  }

  revalidatePath('/');
  revalidatePath('/queue');
  revalidatePath('/outbox');
  revalidatePath(`/leads/${lead.id}`);
}

export async function approveDraftForm(formData: FormData) {
  const id = String(formData.get('draftId') ?? '');
  if (!id) throw new Error('draftId required');
  await approveDraft(id);
}

export async function rejectDraft(draftId: string): Promise<void> {
  const supabase = getServerClient();
  const { data: draft } = await supabase
    .from('outreach_drafts')
    .select('lead_id, status')
    .eq('id', draftId)
    .single();
  if (!draft || draft.status !== 'pending') return;
  await supabase
    .from('outreach_drafts')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', draftId);
  await logEvent({ event_type: 'draft_rejected', lead_id: draft.lead_id, draft_id: draftId });
  revalidatePath('/queue');
}

export async function rejectDraftForm(formData: FormData) {
  const id = String(formData.get('draftId') ?? '');
  if (!id) throw new Error('draftId required');
  await rejectDraft(id);
}

export async function editDraft(formData: FormData) {
  const supabase = getServerClient();
  const id = String(formData.get('draftId') ?? '');
  if (!id) throw new Error('draftId required');
  const sms = String(formData.get('sms_draft') ?? '');
  const subject = String(formData.get('email_subject') ?? '');
  const emailBody = String(formData.get('email_body') ?? '');
  const callOpener = String(formData.get('call_opener') ?? '');
  await supabase
    .from('outreach_drafts')
    .update({
      sms_draft: sms,
      email_subject: subject,
      email_body: emailBody,
      call_opener: callOpener,
      edits_made: true,
    })
    .eq('id', id);
  revalidatePath('/queue');
  revalidatePath(`/leads/${formData.get('leadId') ?? ''}`);
}

export async function dispatchOutboxMessage(id: string): Promise<void> {
  const supabase = getServerClient();
  const { data: msg } = await supabase
    .from('outbox_messages')
    .select('*')
    .eq('id', id)
    .single();
  if (!msg || msg.status !== 'queued') return;
  await supabase
    .from('outbox_messages')
    .update({ status: 'sent_simulated', dispatched_at: new Date().toISOString() })
    .eq('id', id);
  await supabase
    .from('closed_lost_leads')
    .update({ status: 'sent', last_status_change_at: new Date().toISOString() })
    .eq('id', msg.lead_id)
    .in('status', ['approved', 'sent']);
  await logEvent({ event_type: 'message_outboxed', lead_id: msg.lead_id, payload: { outbox_id: id } });
  revalidatePath('/outbox');
  revalidatePath(`/leads/${msg.lead_id}`);
}

export async function dispatchOutboxForm(formData: FormData) {
  const id = String(formData.get('messageId') ?? '');
  if (!id) throw new Error('messageId required');
  await dispatchOutboxMessage(id);
}

export async function classifySimulatedReply(formData: FormData): Promise<void> {
  const supabase = getServerClient();
  const leadId = String(formData.get('leadId') ?? '');
  const channel = String(formData.get('channel') ?? 'sms') as 'sms' | 'email' | 'call';
  const text = String(formData.get('text') ?? '').trim();
  if (!leadId || !text) throw new Error('leadId and text required');

  const { data: lead, error: leadErr } = await supabase
    .from('closed_lost_leads')
    .select('*')
    .eq('id', leadId)
    .single();
  if (leadErr || !lead) throw new Error(`Lead not found: ${leadErr?.message ?? leadId}`);

  const summary = [
    `Name: ${lead.first_name} ${lead.last_name ?? ''}`.trim(),
    lead.project_type ? `Original project: ${lead.project_type}` : null,
    lead.last_touchpoint_summary ? `Last touchpoint: ${lead.last_touchpoint_summary}` : null,
    lead.reason_lost ? `Reason lost: ${lead.reason_lost}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { payload, cost, model } = await classifyReply({ leadSummary: summary, replyText: text });

  let leadStatus: LeadStatus = 'replied';
  if (payload.classification === 'not_interested') leadStatus = 'not_interested';
  if (payload.classification === 'manual_review') leadStatus = 'replied';

  let notified = false;
  if (payload.classification === 'hot') {
    const tg = await sendTelegram(
      `🔥 *HOT REPLY* from ${lead.first_name} ${lead.last_name ?? ''}\nProject: ${lead.project_type ?? '-'}\nReason: ${payload.reason}\n\n"${text.slice(0, 300)}"`,
    );
    notified = tg.ok;
  }

  const { data: replyRow } = await supabase
    .from('reply_events')
    .insert({
      lead_id: leadId,
      channel,
      raw_text: text,
      classification: payload.classification as ReplyClassification,
      classification_reason: payload.reason,
      classification_cost_usd: cost,
      model,
      notified_via_telegram: notified,
    })
    .select('id')
    .single();

  await supabase
    .from('closed_lost_leads')
    .update({ status: leadStatus, last_status_change_at: new Date().toISOString() })
    .eq('id', leadId);

  await logEvent({
    event_type: 'reply_classified',
    lead_id: leadId,
    payload: { classification: payload.classification, reason: payload.reason, reply_id: replyRow?.id, notified_via_telegram: notified },
  });

  revalidatePath('/replies');
  revalidatePath('/');
  revalidatePath(`/leads/${leadId}`);
}
