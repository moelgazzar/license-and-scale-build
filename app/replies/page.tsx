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
      <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Failed to load replies: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as ReplyRow[];
  const hot = rows.filter((r) => r.classification === 'hot').length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="section-eyebrow">Step 3 · Inbound replies</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-ink)]">
          Auto-classified replies, surfaced for follow-up.
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-body-text)]">
          In production, GHL or Twilio webhooks deliver inbound SMS / email here. Each reply is classified by OpenAI as
          hot / warm / not interested / manual review. Hot replies fire a Telegram alert immediately so the team calls
          back inside the warm window.
        </p>
        {hot > 0 && (
          <p className="text-[13px] text-[var(--color-muted)]">{hot} hot repl{hot === 1 ? 'y' : 'ies'} captured.</p>
        )}
        <div className="pt-1">
          <Link href="/replies/simulate" className="text-[12.5px] text-[var(--color-muted)] underline-offset-2 hover:text-rausch hover:underline">
            Demo: simulate reply →
          </Link>
        </div>
      </header>

      {rows.length === 0 && (
        <div className="empty-state">
          <h3>No replies yet</h3>
          <p>
            In production a GHL or Twilio webhook delivers replies here automatically. To test the classifier, use the{' '}
            <Link href="/replies/simulate" className="text-rausch hover:underline">demo simulator</Link>.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="card px-6 py-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
                  <Link href={`/leads/${r.lead.id}`} className="hover:underline">
                    {r.lead.first_name} {r.lead.last_name ?? ''}
                  </Link>
                  <span className="ml-2 text-[13px] font-normal text-[var(--color-muted)]">
                    {r.channel.toUpperCase()} · {r.lead.project_type ?? '-'}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className={`badge classification-${r.classification}`}>{r.classification.replace('_', ' ')}</span>
                {r.notified_via_telegram && <span className="text-[var(--color-muted)]">📲 Telegram fired</span>}
              </div>
            </header>
            <blockquote className="mt-3 border-l-2 border-[var(--color-rausch)] pl-3 text-[13.5px] italic text-[var(--color-ink)]">
              {r.raw_text}
            </blockquote>
            <p className="mt-2 text-[13px] text-[var(--color-body-text)]">
              <span className="font-semibold">AI rationale:</span> {r.classification_reason}
            </p>
            <p className="mt-1.5 text-[11.5px] text-[var(--color-muted)]">
              {new Date(r.created_at).toLocaleString()} · model: {r.model}
              {r.classification_cost_usd !== null && ` · $${Number(r.classification_cost_usd).toFixed(4)}`}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
