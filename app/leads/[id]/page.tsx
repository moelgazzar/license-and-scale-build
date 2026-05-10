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
      <Link href="/" className="text-sm text-stone-700 hover:underline">
        ← All leads
      </Link>
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wider text-stone-500">Lead</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {lead.first_name} {lead.last_name ?? ''}
        </h1>
        <p className="text-stone-600">
          {lead.project_type ?? '-'} · {lead.city ?? '-'} {lead.zip ? `(${lead.zip})` : ''} · est. ${' '}
          {lead.est_project_value ? Math.round(Number(lead.est_project_value)).toLocaleString() : '-'}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`status-badge status-${lead.status}`}>{lead.status.replace(/_/g, ' ')}</span>
          <span className="text-stone-500">attempt {lead.attempt_count}/3</span>
          {lead.last_touchpoint_at && (
            <span className="text-stone-500">
              last touchpoint {new Date(lead.last_touchpoint_at).toLocaleDateString()}
            </span>
          )}
          {lead.reason_lost && <span className="text-stone-500">· reason: {lead.reason_lost}</span>}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Last touchpoint summary</p>
          <p className="mt-1 text-sm text-stone-800">{lead.last_touchpoint_summary ?? '-'}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Internal notes</p>
          <p className="mt-1 text-sm text-stone-800">{lead.notes ?? '-'}</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Drafts ({drafts.length})</h2>
        <div className="mt-3 space-y-3">
          {drafts.length === 0 && <EmptyCard label="No drafts yet." />}
          {drafts.map((d) => (
            <article key={d.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <header className="flex items-center justify-between text-xs text-stone-500">
                <span>
                  {new Date(d.created_at).toLocaleString()} · model {d.model}
                  {d.generation_cost_usd !== null && ` · $${Number(d.generation_cost_usd).toFixed(4)}`}
                </span>
                <span
                  className={`status-badge ${
                    d.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : d.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-600'
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
                    <button
                      type="submit"
                      className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Reject
                    </button>
                  </form>
                  <form action={approveDraftForm}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Approve & queue
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Outbox ({outbox.length})</h2>
        <div className="mt-3 space-y-3">
          {outbox.length === 0 && <EmptyCard label="Nothing approved to outbox yet." />}
          {outbox.map((m) => (
            <article key={m.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <header className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {m.channel.toUpperCase()} · to {m.to_address}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`status-badge ${
                      m.status === 'queued'
                        ? 'bg-amber-100 text-amber-800'
                        : m.status === 'sent_simulated'
                        ? 'bg-violet-100 text-violet-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                  {m.status === 'queued' && (
                    <form action={dispatchOutboxForm}>
                      <input type="hidden" name="messageId" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-stone-900 px-3 py-1 text-xs text-white hover:bg-stone-700"
                      >
                        Simulate dispatch
                      </button>
                    </form>
                  )}
                </div>
              </header>
              {m.subject && <p className="mt-2 text-sm font-medium text-stone-700">{m.subject}</p>}
              <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{m.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Replies ({replies.length})</h2>
        <div className="mt-3 space-y-3">
          {replies.length === 0 && <EmptyCard label="No replies yet." />}
          {replies.map((r) => (
            <article key={r.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <header className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.channel.toUpperCase()} reply</span>
                <span className={`status-badge classification-${r.classification}`}>
                  {r.classification.replace('_', ' ')}
                </span>
              </header>
              <blockquote className="mt-2 border-l-2 border-stone-300 pl-3 text-sm italic text-stone-700">
                {r.raw_text}
              </blockquote>
              <p className="mt-2 text-sm text-stone-600">
                <span className="font-medium">AI rationale:</span> {r.classification_reason}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {new Date(r.created_at).toLocaleString()} · model {r.model}
                {r.notified_via_telegram && ' · 📲 Telegram'}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-stone-800">{value}</p>
    </div>
  );
}

function EmptyCard({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-stone-200 bg-white px-5 py-6 text-sm text-stone-500">{label}</div>;
}
