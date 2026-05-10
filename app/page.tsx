import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { generateDraftsForm } from './actions';
import type { ClosedLostLead, LeadStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS: Array<{ key: 'all' | LeadStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'generated', label: 'Generated' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
  { key: 'replied', label: 'Replied' },
  { key: 'not_interested', label: 'Not interested' },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; min_value?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? 'all') as 'all' | LeadStatus;
  const minValue = Number(sp.min_value ?? 0);

  const supabase = getServerClient();
  let query = supabase.from('closed_lost_leads').select('*').order('est_project_value', { ascending: false });
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (minValue > 0) {
    query = query.gte('est_project_value', minValue);
  }
  const { data: leadsRaw, error } = await query;
  if (error) {
    return <ErrorBanner message={`Supabase query failed: ${error.message}`} />;
  }
  const leads: ClosedLostLead[] = (leadsRaw ?? []) as ClosedLostLead[];

  const counts = await getStatusCounts(supabase);
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.est_project_value) || 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wider text-stone-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Closed-Lost Reactivation</h1>
        <p className="max-w-2xl text-stone-600">
          1,400+ closed-lost leads sit in GHL with sunk CAC. This control center re-engages them: select high-value
          leads, generate Marcus-voice drafts, review, approve, and route to the outbox for GHL dispatch.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Leads in pipeline" value={String(counts.total)} />
        <Stat label="Pending review" value={String(counts.generated)} />
        <Stat label="Approved" value={String(counts.approved)} />
        <Stat label="Replied" value={String(counts.replied)} />
      </div>

      <section className="rounded-xl border border-stone-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Cold leads</h2>
            <p className="text-sm text-stone-500">
              Showing {leads.length} lead{leads.length === 1 ? '' : 's'} · est. value $
              {Math.round(totalValue).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === 'all' ? '/' : `/?status=${f.key}`}
                className={
                  f.key === status
                    ? 'rounded-md bg-stone-900 px-3 py-1 text-white'
                    : 'rounded-md px-3 py-1 text-stone-700 hover:bg-stone-100'
                }
              >
                {f.label}
              </Link>
            ))}
          </div>
        </header>

        <form action={generateDraftsForm}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="w-10 px-5 py-3" />
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">City</th>
                  <th className="px-3 py-3">Project</th>
                  <th className="px-3 py-3">Est. value</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Reason lost</th>
                  <th className="px-3 py-3">Cold for</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const eligible =
                    lead.attempt_count < 3 && lead.status !== 'do_not_contact' && lead.status !== 'max_attempts_reached';
                  const months = lead.last_touchpoint_at
                    ? Math.round(
                        (Date.now() - new Date(lead.last_touchpoint_at).getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      )
                    : null;
                  return (
                    <tr key={lead.id} className="border-t border-stone-100 align-top hover:bg-stone-50">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          name="leadId"
                          value={lead.id}
                          disabled={!eligible}
                          className="h-4 w-4 cursor-pointer rounded border-stone-300"
                          aria-label={`Select ${lead.first_name} ${lead.last_name ?? ''}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-medium">
                        <Link href={`/leads/${lead.id}`} className="hover:underline">
                          {lead.first_name} {lead.last_name ?? ''}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-stone-600">{lead.city ?? '-'}</td>
                      <td className="px-3 py-3 text-stone-700">{lead.project_type ?? '-'}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {lead.est_project_value
                          ? `$${Math.round(Number(lead.est_project_value)).toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-3 text-stone-600">{lead.reason_lost ?? '-'}</td>
                      <td className="px-3 py-3 text-stone-600">{months !== null ? `${months}mo` : '-'}</td>
                      <td className="px-3 py-3 tabular-nums text-stone-600">{lead.attempt_count}/3</td>
                      <td className="px-3 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-emerald-700 hover:underline">
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-stone-500">
                      No leads matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 bg-stone-50 px-5 py-4 text-sm">
            <p className="text-stone-600">
              Select leads above. Eligibility: attempts &lt; 3 and not do-not-contact.
            </p>
            <button
              type="submit"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 active:bg-emerald-900"
            >
              Generate drafts for selected
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`status-badge status-${status}`}>{status.replace(/_/g, ' ')}</span>;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
      <p className="font-semibold">Error loading data</p>
      <p className="mt-1 text-sm">{message}</p>
      <p className="mt-3 text-xs text-rose-700">
        Check that <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> are set, and that
        the schema in <code>supabase/schema.sql</code> has been applied.
      </p>
    </div>
  );
}

async function getStatusCounts(supabase: ReturnType<typeof getServerClient>) {
  const { data } = await supabase.from('closed_lost_leads').select('status');
  const rows = data ?? [];
  const counts = {
    total: rows.length,
    new: 0,
    generated: 0,
    approved: 0,
    sent: 0,
    replied: 0,
    not_interested: 0,
  };
  for (const r of rows as Array<{ status: LeadStatus }>) {
    if (r.status in counts) (counts as Record<string, number>)[r.status]++;
  }
  return counts;
}
