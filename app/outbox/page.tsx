import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { dispatchOutboxForm } from '../actions';
import type { ClosedLostLead, OutboxMessage, OutboxStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface OutboxRow extends OutboxMessage {
  lead: ClosedLostLead;
}

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? 'all') as 'all' | OutboxStatus;
  const supabase = getServerClient();
  let q = supabase
    .from('outbox_messages')
    .select(`*, lead:closed_lost_leads (*)`)
    .order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) {
    return (
      <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load outbox: {error.message}
      </div>
    );
  }
  const rows = (data ?? []) as OutboxRow[];
  const queuedCount = rows.filter((r) => r.status === 'queued').length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="section-eyebrow">Outbox</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-ink)]">
          Approved messages waiting to dispatch.
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-body-text)]">
          Approved drafts land here. In production, GHL or Twilio dispatch is wired behind the{' '}
          <code className="rounded bg-[var(--color-surface-strong)] px-1 text-[12px]">GHL_SEND_ENABLED</code> flag. The simulated
          dispatch button below toggles state without sending to a real customer.
        </p>
        {queuedCount > 0 && (
          <p className="text-[13px] text-[var(--color-muted)]">{queuedCount} message{queuedCount === 1 ? '' : 's'} ready to dispatch.</p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/queue" className="text-[13px] font-medium text-rausch hover:underline">
            ← Approval queue
          </Link>
          <Link href="/replies/simulate" className="text-[12.5px] text-[var(--color-muted)] underline-offset-2 hover:text-rausch hover:underline">
            Demo: simulate reply →
          </Link>
        </div>
      </header>
      <nav className="flex flex-wrap gap-1.5">
        {(['all', 'queued', 'sent_simulated', 'failed'] as const).map((k) => (
          <Link
            key={k}
            href={k === 'all' ? '/outbox' : `/outbox?status=${k}`}
            className={`filter-pill ${status === k ? 'filter-pill-active' : ''}`}
          >
            {k.replace(/_/g, ' ')}
          </Link>
        ))}
      </nav>
      {rows.length === 0 && (
        <div className="empty-state">
          <h3>Outbox is empty</h3>
          <p>
            Approve a draft from the <Link href="/queue" className="text-rausch hover:underline">queue</Link> to populate this list.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {rows.map((msg) => (
          <article key={msg.id} className="card px-6 py-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
                  <Link href={`/leads/${msg.lead.id}`} className="hover:underline">
                    {msg.lead.first_name} {msg.lead.last_name ?? ''}
                  </Link>
                  <span className="ml-2 text-[13px] font-normal text-[var(--color-muted)]">
                    {msg.channel.toUpperCase()} · to {msg.to_address}
                  </span>
                </h2>
                {msg.subject && <p className="mt-1 text-[13.5px] font-medium text-[var(--color-ink)]">{msg.subject}</p>}
              </div>
              <div className="flex items-center gap-2">
                <OutboxBadge status={msg.status} />
                {msg.status === 'queued' && (
                  <form action={dispatchOutboxForm}>
                    <input type="hidden" name="messageId" value={msg.id} />
                    <button type="submit" className="btn-secondary text-[12.5px] px-3 py-1.5">
                      Simulate dispatch
                    </button>
                  </form>
                )}
              </div>
            </header>
            <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--color-body-text)]">{msg.body}</p>
            <p className="mt-3 text-[11.5px] text-[var(--color-muted)]">
              created {new Date(msg.created_at).toLocaleString()}
              {msg.dispatched_at ? ` · dispatched ${new Date(msg.dispatched_at).toLocaleString()}` : ''}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function OutboxBadge({ status }: { status: OutboxStatus }) {
  const map: Record<OutboxStatus, string> = {
    queued: 'badge status-approved',
    sent_simulated: 'badge status-sent',
    failed: 'badge status-do_not_contact',
  };
  return <span className={map[status]}>{status.replace('_', ' ')}</span>;
}
