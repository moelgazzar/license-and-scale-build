import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import type { ClosedLostLead, ReplyEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ReplyRow extends ReplyEvent {
  lead: ClosedLostLead;
}

export default async function RepliesPage() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('reply_events')
    .select(`*, lead:closed_lost_leads (*)`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load replies: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as ReplyRow[];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-stone-500">Replies</p>
          <h1 className="text-3xl font-semibold tracking-tight">Inbound classifications</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Customer replies (real in production via GHL/Twilio webhook; simulated here via the Simulate Reply page).
            Hot replies trigger an immediate Telegram alert to Marcus.
          </p>
        </div>
        <Link href="/replies/simulate" className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700">
          + Simulate a reply
        </Link>
      </header>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-10 text-center text-stone-600">
            No replies yet. Use{' '}
            <Link href="/replies/simulate" className="font-medium underline">
              Simulate Reply
            </Link>{' '}
            to test the classifier.
          </div>
        )}
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  <Link href={`/leads/${r.lead.id}`} className="hover:underline">
                    {r.lead.first_name} {r.lead.last_name ?? ''}
                  </Link>
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    {r.channel.toUpperCase()} · {r.lead.project_type ?? '-'}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`status-badge classification-${r.classification}`}>
                  {r.classification.replace('_', ' ')}
                </span>
                {r.notified_via_telegram && <span className="text-stone-500">📲 Telegram</span>}
              </div>
            </header>
            <blockquote className="mt-3 border-l-2 border-stone-300 pl-3 text-sm italic text-stone-700">
              {r.raw_text}
            </blockquote>
            <p className="mt-2 text-sm text-stone-600">
              <span className="font-medium">AI rationale:</span> {r.classification_reason}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {new Date(r.created_at).toLocaleString()} · model: {r.model}
              {r.classification_cost_usd !== null && ` · $${Number(r.classification_cost_usd).toFixed(4)}`}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
