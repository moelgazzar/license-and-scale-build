import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { classifySimulatedReply } from '../../actions';
import type { ClosedLostLead } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SAMPLE_REPLIES: Array<{ label: string; text: string }> = [
  {
    label: 'Hot',
    text: "Hey Marcus, yes still interested - happy to walk it again Saturday morning if that works. We saved up enough now.",
  },
  {
    label: 'Warm',
    text: 'Thanks for reaching out. We are still thinking about it. Maybe in a few months when we figure out the budget.',
  },
  {
    label: 'Not interested',
    text: 'We already finished the project last year. Please remove us from your list.',
  },
  {
    label: 'Manual review',
    text: 'I have a complaint about the way your last estimate was structured. Need to talk to Marcus directly before I respond to anything else.',
  },
];

export default async function SimulateReplyPage() {
  const supabase = getServerClient();
  const { data: rows } = await supabase
    .from('closed_lost_leads')
    .select('id, first_name, last_name, project_type, status, city')
    .order('first_name')
    .limit(200);
  const leads = (rows ?? []) as Array<Pick<ClosedLostLead, 'id' | 'first_name' | 'last_name' | 'project_type' | 'status' | 'city'>>;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="section-eyebrow">Simulate</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-ink)]">Paste a customer reply.</h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-body-text)]">
          In production, a GHL or Twilio webhook delivers replies into this flow automatically. For the demo, paste any
          reply text below and the OpenAI classifier will tag it hot / warm / not interested / manual review and update
          the lead. Hot replies immediately ping Telegram.
        </p>
        <div>
          <Link href="/replies" className="text-[13px] font-medium text-rausch hover:underline">
            ← Replies feed
          </Link>
        </div>
      </header>

      <form action={classifySimulatedReply} className="card space-y-5 p-6">
        <label className="block">
          <span className="section-eyebrow">Lead</span>
          <select
            name="leadId"
            required
            className="mt-1 block w-full rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          >
            <option value="">Select a lead…</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name ?? ''} {l.project_type ? `· ${l.project_type}` : ''} {l.city ? `· ${l.city}` : ''} · {l.status}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="section-eyebrow">Channel</span>
          <select
            name="channel"
            defaultValue="sms"
            className="mt-1 block w-full rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
          </select>
        </label>
        <label className="block">
          <span className="section-eyebrow">Reply text</span>
          <textarea
            name="text"
            required
            minLength={5}
            rows={5}
            placeholder="Paste the customer reply..."
            className="mt-1 block w-full rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          />
        </label>

        <details className="rounded-[10px] bg-[var(--color-surface-soft)] p-4 open:bg-[var(--color-surface-soft)]">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-ink)] hover:text-[var(--color-rausch)]">
            Sample replies (click any line to copy)
          </summary>
          <ul className="mt-3 space-y-2 text-[13px] text-[var(--color-body-text)]">
            {SAMPLE_REPLIES.map((s) => (
              <li key={s.label}>
                <span className="font-semibold text-[var(--color-ink)]">{s.label}:</span> {s.text}
              </li>
            ))}
          </ul>
        </details>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Classify reply</button>
        </div>
      </form>
    </div>
  );
}
