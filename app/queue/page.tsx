import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { approveDraftForm, rejectDraftForm, editDraft } from '../actions';
import type { ClosedLostLead, OutreachDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DraftWithLead extends OutreachDraft {
  lead: ClosedLostLead;
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; failed?: string; error?: string; error_sample?: string }>;
}) {
  const sp = await searchParams;
  const generated = Number(sp.generated ?? -1);
  const failed = Number(sp.failed ?? 0);
  const errorMsg = sp.error;
  const errorSample = sp.error_sample;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('outreach_drafts')
    .select(`*, lead:closed_lost_leads (*)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load queue: {error.message}
      </div>
    );
  }

  const drafts = (data ?? []) as DraftWithLead[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="section-eyebrow">Step 2 · Approval queue</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-ink)]">
          Review drafts before anything is sent.
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-body-text)]">
          Approving queues SMS and email drafts to the outbox <span className="font-semibold text-[var(--color-ink)]">and</span> sends an internal Telegram notification to the team. <span className="font-semibold text-[var(--color-ink)]">No customer SMS or email is sent in this demo</span> --- production wires the outbox to GHL/Twilio behind the <code className="rounded bg-[var(--color-surface-strong)] px-1 text-[12px]">GHL_SEND_ENABLED</code> flag.
        </p>
        <div>
          <Link href="/" className="text-[13px] font-medium text-rausch hover:underline">
            -← Back to leads
          </Link>
        </div>
      </header>

      {/* Result banners after a generate run */}
      {errorMsg && (
        <ResultBanner
          kind="error"
          title="Generation failed"
          body={
            <>
              Could not complete generation: <code className="font-mono text-[12px]">{decodeURIComponent(errorMsg)}</code>. Common causes: OpenAI API key invalid, Supabase service role key wrong, or model name not available. Check Vercel logs at the inspector URL.
            </>
          }
        />
      )}
      {generated >= 0 && !errorMsg && generated > 0 && (
        <ResultBanner
          kind="success"
          title={`Generated ${generated} draft${generated === 1 ? '' : 's'}.`}
          body={
            <>
              Review and approve below. <span className="font-semibold">Telegram fires only after you approve a draft</span> --- never on generation.
              {failed > 0 && (
                <>
                  {' '}
                  <span className="text-rose-700">{failed} draft{failed === 1 ? '' : 's'} failed</span>
                  {errorSample ? <> ({decodeURIComponent(errorSample)})</> : null}.
                </>
              )}
            </>
          }
        />
      )}
      {generated === 0 && !errorMsg && drafts.length === 0 && (
        <ResultBanner
          kind="error"
          title="No drafts were created"
          body={
            <>
              {failed > 0 ? (
                <>
                  All {failed} attempted leads failed{errorSample ? ` (${decodeURIComponent(errorSample)})` : ''}. Check OpenAI API key,{' '}
                  <code className="font-mono text-[12px]">OPENAI_MODEL</code>, and Supabase env vars on Vercel.
                </>
              ) : (
                <>No leads were eligible. Pick eligible leads (attempts &lt; 3, not opted out) and try again.</>
              )}
            </>
          }
        />
      )}

      {drafts.length === 0 && generated < 0 && (
        <div className="empty-state">
          <h3>Approval queue is clear</h3>
          <p>
            Head to the <Link href="/" className="text-rausch hover:underline">leads dashboard</Link>, select a few high-value cold
            leads, and click Generate reactivation drafts.
          </p>
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

function ResultBanner({
  kind,
  title,
  body,
}: {
  kind: 'success' | 'error';
  title: string;
  body: React.ReactNode;
}) {
  const cls =
    kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-rose-200 bg-rose-50 text-rose-900';
  return (
    <div className={`rounded-[14px] border ${cls} px-5 py-4`}>
      <p className="text-[14.5px] font-semibold">{title}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed">{body}</p>
    </div>
  );
}

function DraftCard({ draft }: { draft: DraftWithLead }) {
  const lead = draft.lead;
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-hairline-soft)] px-6 py-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">
            <Link href={`/leads/${lead.id}`} className="hover:underline">
              {lead.first_name} {lead.last_name ?? ''}
            </Link>
            <span className="ml-2 text-[13px] font-normal text-[var(--color-muted)]">
              {lead.project_type} · {lead.city}
            </span>
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
            Est. ${lead.est_project_value ? Math.round(Number(lead.est_project_value)).toLocaleString() : '-'} ·
            attempt {lead.attempt_count + 1}/3
          </p>
        </div>
        <div className="text-[11.5px] text-[var(--color-muted)]">
          {draft.model}
          {draft.generation_cost_usd !== null && ` · $${Number(draft.generation_cost_usd).toFixed(4)}`}
        </div>
      </header>

      <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="section-eyebrow">AI rationale</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink)]">{draft.rationale}</p>
          </div>
          <div>
            <p className="section-eyebrow">Lead context</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-body-text)] whitespace-pre-line">
              {lead.last_touchpoint_summary}
            </p>
          </div>
          {lead.notes && (
            <div>
              <p className="section-eyebrow">Internal notes</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">{lead.notes}</p>
            </div>
          )}
        </div>
        <form action={editDraft} className="space-y-3">
          <input type="hidden" name="draftId" value={draft.id} />
          <input type="hidden" name="leadId" value={lead.id} />
          <Field label="SMS draft" name="sms_draft" defaultValue={draft.sms_draft ?? ''} rows={3} />
          <Field label="Email subject" name="email_subject" defaultValue={draft.email_subject ?? ''} />
          <Field label="Email body" name="email_body" defaultValue={draft.email_body ?? ''} rows={5} />
          <Field label="Call opener (Marcus reads aloud)" name="call_opener" defaultValue={draft.call_opener ?? ''} rows={2} />
          <button type="submit" className="btn-secondary">
            Save edits
          </button>
        </form>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-6 py-3">
        <form action={rejectDraftForm}>
          <input type="hidden" name="draftId" value={draft.id} />
          <button type="submit" className="btn-ghost">Reject</button>
        </form>
        <form action={approveDraftForm}>
          <input type="hidden" name="draftId" value={draft.id} />
          <button type="submit" className="btn-primary">Approve & queue outreach + notify team</button>
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
  const baseInput =
    'mt-1 block w-full rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2 text-[13.5px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none';
  return (
    <label className="block">
      <span className="section-eyebrow">{label}</span>
      {rows > 1 ? (
        <textarea name={name} defaultValue={defaultValue} rows={rows} className={baseInput} />
      ) : (
        <input name={name} defaultValue={defaultValue} className={baseInput} />
      )}
    </label>
  );
}
