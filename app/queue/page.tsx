import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { approveDraftForm, rejectDraftForm, editDraft } from '../actions';
import type { ClosedLostLead, OutreachDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DraftWithLead extends OutreachDraft {
  lead: ClosedLostLead;
}

export default async function QueuePage() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('outreach_drafts')
    .select(`*, lead:closed_lost_leads (*)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load queue: {error.message}
      </div>
    );
  }

  const drafts = (data ?? []) as DraftWithLead[];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-stone-500">Approval queue</p>
          <h1 className="text-3xl font-semibold tracking-tight">Pending review</h1>
          <p className="mt-2 text-stone-600">
            {drafts.length} draft{drafts.length === 1 ? '' : 's'} waiting for approval. Approving queues SMS + email to
            the outbox and pings Telegram.
          </p>
        </div>
        <Link href="/" className="text-sm text-stone-700 hover:underline">
          ← Back to leads
        </Link>
      </header>

      {drafts.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-10 text-center text-stone-600">
          No pending drafts. Generate some from the leads dashboard.
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} />
        ))}
      </div>
    </div>
  );
}

function DraftCard({ draft }: { draft: DraftWithLead }) {
  const lead = draft.lead;
  return (
    <article className="rounded-xl border border-stone-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">
            <Link href={`/leads/${lead.id}`} className="hover:underline">
              {lead.first_name} {lead.last_name ?? ''}
            </Link>
            <span className="ml-2 text-sm font-normal text-stone-500">
              {lead.project_type} · {lead.city}
            </span>
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Est. ${lead.est_project_value ? Math.round(Number(lead.est_project_value)).toLocaleString() : '-'} · attempt{' '}
            {lead.attempt_count + 1}/3
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>model: {draft.model}</span>
          {draft.generation_cost_usd !== null && (
            <span>· cost: ${Number(draft.generation_cost_usd).toFixed(4)}</span>
          )}
        </div>
      </header>

      <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Rationale</p>
          <p className="mt-1 text-sm text-stone-800">{draft.rationale}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Lead context</p>
          <p className="mt-1 text-sm text-stone-700 whitespace-pre-line">
            {lead.last_touchpoint_summary}
          </p>
          {lead.notes && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Internal notes</p>
              <p className="mt-1 text-sm text-stone-600">{lead.notes}</p>
            </>
          )}
        </div>
        <form action={editDraft} className="space-y-3">
          <input type="hidden" name="draftId" value={draft.id} />
          <input type="hidden" name="leadId" value={lead.id} />
          <Field label="SMS draft" name="sms_draft" defaultValue={draft.sms_draft ?? ''} rows={3} />
          <Field label="Email subject" name="email_subject" defaultValue={draft.email_subject ?? ''} />
          <Field label="Email body" name="email_body" defaultValue={draft.email_body ?? ''} rows={5} />
          <Field label="Call opener (Marcus reads aloud)" name="call_opener" defaultValue={draft.call_opener ?? ''} rows={2} />
          <button
            type="submit"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
          >
            Save edits
          </button>
        </form>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-5 py-3">
        <form action={rejectDraftForm}>
          <input type="hidden" name="draftId" value={draft.id} />
          <button
            type="submit"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
          >
            Reject
          </button>
        </form>
        <form action={approveDraftForm}>
          <input type="hidden" name="draftId" value={draft.id} />
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Approve & queue to outbox
          </button>
        </form>
      </footer>
    </article>
  );
}

function Field({
  label,
  name,
  defaultValue,
  rows = 1,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</span>
      {rows > 1 ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          className="mt-1 block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-400 focus:outline-none"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="mt-1 block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-400 focus:outline-none"
        />
      )}
    </label>
  );
}
