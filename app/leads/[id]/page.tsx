import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase';
import {
  approveDraftForm,
  rejectDraftForm,
  dispatchOutboxForm,
} from '../../actions';
import type {
  ClosedLostLead,
  OutboxMessage,
  OutreachDraft,
  ReplyEvent,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const [leadRes, draftsRes, outboxRes, repliesRes] = await Promise.all([
    supabase.from('closed_lost_leads').select('*').eq('id', id).single(),
    supabase.from('outreach_drafts').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('outbox_messages').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('reply_events').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
  ]);

  if (leadRes.error || !leadRes.data) {
    notFound();
  }
  const lead = leadRes.data as ClosedLostLead;
  const drafts = (draftsRes.data ?? []) as OutreachDraft[];
  const outbox = (outboxRes.data ?? []) as OutboxMessage[];
  const replies = (repliesRes.data ?? []) as ReplyEvent[];

  return (
    <div className="space-y-8">
      <Link href="/" className="text-[13px] font-medium text-rausch hover:underline">
        ← All leads
      </Link>
      <header className="space-y-3">
        <p className="section-eyebrow">Lead detail</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--color-ink)]">
          {lead.first_name} {lead.last_name ?? ''}
        </h1>
        <p className="text-[14px] text-[var(--color-body-text)]">
          {lead.project_type ?? '-'} · {lead.city ?? '-'} {lead.zip ? `(${lead.zip})` : ''} · est. ${' '}
          {lead.est_project_value ? Math.round(Number(lead.est_project_value)).toLocaleString() : '-'}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className={`badge status-${lead.status}`}>{lead.status.replace(/_/g, ' ')}</span>
          <span className="text-[var(--color-muted)]">attempt {lead.attempt_count}/3</span>
          {lead.last_touchpoint_at && (
            <span className="text-[var(--color-muted)]">
              · last touchpoint {new Date(lead.last_touchpoint_at).toLocaleDateString()}
            </span>
          )}
          {lead.reason_lost && <span className="text-[var(--color-muted)]">· reason: {lead.reason_lost}</span>}
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-5">
          <p className="section-eyebrow">Last touchpoint summary</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink)]">{lead.last_touchpoint_summary ?? '-'}</p>
        </div>
        <div className="card p-5">
          <p className="section-eyebrow">Internal notes</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink)]">{lead.notes ?? '-'}</p>
        </div>
      </section>

      <Section title={`Drafts (${drafts.length})`}>
        {drafts.length === 0 && <EmptyCard label="No drafts yet for this lead." />}
        {drafts.map((d) => (
          <article key={d.id} className="card p-5">
            <header className="flex items-center justify-between text-[12px] text-[var(--color-muted)]">
              <span>
                {new Date(d.created_at).toLocaleString()} · {d.model}
                {d.generation_cost_usd !== null && ` · $${Number(d.generation_cost_usd).toFixed(4)}`}
              </span>
              <span
                className={`badge ${
                  d.status === 'pending'
                    ? 'status-approved'
                    : d.status === 'approved'
                    ? 'status-replied'
                    : 'status-not_interested'
                }`}
              >
                {d.status}
              </span>
            </header>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="SMS draft" value={d.sms_draft ?? '-'} />
              <Field label="Call opener" value={d.call_opener ?? '-'} />
              <Field label="Email subject" value={d.email_subject ?? '-'} />
              <Field label="Rationale" value={d.rationale ?? '-'} />
              <div className="md:col-span-2">
                <Field label="Email body" value={d.email_body ?? '-'} />
              </div>
            </div>
            {d.status === 'pending' && (
              <div className="mt-4 flex justify-end gap-2">
                <form action={rejectDraftForm}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button type="submit" className="btn-ghost">Reject</button>
                </form>
                <form action={approveDraftForm}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button type="submit" className="btn-primary">Approve & queue</button>
                </form>
              </div>
            )}
          </article>
        ))}
      </Section>

      <Section title={`Outbox (${outbox.length})`}>
        {outbox.length === 0 && <EmptyCard label="Nothing approved to outbox yet." />}
        {outbox.map((m) => (
          <article key={m.id} className="card p-5">
            <header className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[var(--color-ink)]">
                {m.channel.toUpperCase()} · to {m.to_address}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    m.status === 'queued'
                      ? 'status-approved'
                      : m.status === 'sent_simulated'
                      ? 'status-sent'
                      : 'status-do_not_contact'
                  }`}
                >
                  {m.status.replace('_', ' ')}
                </span>
                {m.status === 'queued' && (
                  <form action={dispatchOutboxForm}>
                    <input type="hidden" name="messageId" value={m.id} />
                    <button type="submit" className="btn-secondary text-[12px] px-3 py-1.5">
                      Simulate dispatch
                    </button>
                  </form>
                )}
              </div>
            </header>
            {m.subject && <p className="mt-2 text-[13.5px] font-medium text-[var(--color-ink)]">{m.subject}</p>}
            <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--color-body-text)]">{m.body}</p>
          </article>
        ))}
      </Section>

      <Section title={`Replies (${replies.length})`}>
        {replies.length === 0 && <EmptyCard label="No replies yet." />}
        {replies.map((r) => (
          <article key={r.id} className="card p-5">
            <header className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[var(--color-ink)]">{r.channel.toUpperCase()} reply</span>
              <span className={`badge classification-${r.classification}`}>
                {r.classification.replace('_', ' ')}
              </span>
            </header>
            <blockquote className="mt-2 border-l-2 border-[var(--color-rausch)] pl-3 text-[13.5px] italic text-[var(--color-ink)]">
              {r.raw_text}
            </blockquote>
            <p className="mt-2 text-[13px] text-[var(--color-body-text)]">
              <span className="font-semibold">AI rationale:</span> {r.classification_reason}
            </p>
            <p className="mt-1.5 text-[11.5px] text-[var(--color-muted)]">
              {new Date(r.created_at).toLocaleString()} · {r.model}
              {r.notified_via_telegram && ' · 📲 Telegram'}
            </p>
          </article>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="section-eyebrow">{label}</p>
      <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function EmptyCard({ label }: { label: string }) {
  return <div className="rounded-[14px] border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-6 text-[13px] text-[var(--color-muted)]">{label}</div>;
}
