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
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-stone-500">Simulate</p>
          <h1 className="text-3xl font-semibold tracking-tight">Paste a customer reply</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            In production a GHL or Twilio webhook delivers replies here. For the demo, paste any reply text - the OpenAI
            classifier will tag it hot / warm / not interested / manual review and update the lead. Hot replies
            immediately ping Telegram.
          </p>
        </div>
        <Link href="/replies" className="text-sm text-stone-700 hover:underline">
          ← Replies feed
        </Link>
      </header>

      <form action={classifySimulatedReply} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Lead</span>
          <select
            name="leadId"
            required
            className="mt-1 block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-400 focus:outline-none"
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
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Channel</span>
          <select
            name="channel"
            defaultValue="sms"
            className="mt-1 block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-400 focus:outline-none"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Reply text</span>
          <textarea
            name="text"
            required
            minLength={5}
            rows={5}
            placeholder="Paste the customer reply..."
            className="mt-1 block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-400 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <details>
            <summary className="cursor-pointer text-xs text-stone-600 hover:text-stone-900">Sample replies (click to expand)</summary>
            <ul className="mt-2 space-y-1.5 text-xs text-stone-600">
              {SAMPLE_REPLIES.map((s) => (
                <li key={s.label}>
                  <span className="font-semibold">{s.label}:</span> {s.text}
                </li>
              ))}
            </ul>
          </details>
          <button
            type="submit"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Classify reply
          </button>
        </div>
      </form>
    </div>
  );
}
