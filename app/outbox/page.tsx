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
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load outbox: {error.message}
      </div>
    );
  }
  const rows = (data ?? []) as OutboxRow[];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-stone-500">Outbox</p>
          <h1 className="text-3xl font-semibold tracking-tight">Approved messages</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Messages flow here on approval. Production wires this to GHL or Twilio dispatch behind the{' '}
            <code>GHL_SEND_ENABLED</code> flag. The simulated dispatch button toggles state without sending to a real
            customer.
          </p>
        </div>
        <Link href="/queue" className="text-sm text-stone-700 hover:underline">
          ← Approval queue
        </Link>
      </header>
      <nav className="flex gap-1 text-sm">
        {(['all', 'queued', 'sent_simulated', 'failed'] as const).map((k) => (
          <Link
            key={k}
            href={k === 'all' ? '/outbox' : `/outbox?status=${k}`}
            className={
              status === k
                ? 'rounded-md bg-stone-900 px-3 py-1 text-white'
                : 'rounded-md px-3 py-1 text-stone-700 hover:bg-stone-100'
            }
          >
            {k.replace(/_/g, ' ')}
          </Link>
        ))}
      </nav>
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-10 text-center text-stone-600">
            No outbox messages yet. Approve a draft from the queue to populate this list.
          </div>
        )}
        {rows.map((msg) => (
          <article key={msg.id} className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  <Link href={`/leads/${msg.lead.id}`} className="hover:underline">
                    {msg.lead.first_name} {msg.lead.last_name ?? ''}
                  </Link>
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    {msg.channel.toUpperCase()} · to {msg.to_address}
                  </span>
                </h2>
                {msg.subject && <p className="mt-1 text-sm font-medium text-stone-700">{msg.subject}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`status-badge ${
                    msg.status === 'queued'
                      ? 'bg-amber-100 text-amber-800'
                      : msg.status === 'sent_simulated'
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {msg.status.replace('_', ' ')}
                </span>
                {msg.status === 'queued' && (
                  <form action={dispatchOutboxForm}>
                    <input type="hidden" name="messageId" value={msg.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700"
                    >
                      Simulate dispatch
                    </button>
                  </form>
                )}
              </div>
            </header>
            <p className="mt-3 whitespace-pre-line text-sm text-stone-700">{msg.body}</p>
            <p className="mt-3 text-xs text-stone-500">
              created {new Date(msg.created_at).toLocaleString()}
              {msg.dispatched_at ? ` · dispatched ${new Date(msg.dispatched_at).toLocaleString()}` : ''}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
