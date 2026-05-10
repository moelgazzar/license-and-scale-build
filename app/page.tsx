import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { generateDraftsForm } from './actions';
import type { ClosedLostLead, LeadStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS: Array<{ key: 'all' | LeadStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'generated', label: 'Drafted' },
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
  if (status !== 'all') query = query.eq('status', status);
  if (minValue > 0) query = query.gte('est_project_value', minValue);

  const [leadsRes, kpisRes] = await Promise.all([query, getKpis(supabase)]);

  if (leadsRes.error) {
    return <ErrorBanner message={`Supabase query failed: ${leadsRes.error.message}`} />;
  }
  const leads: ClosedLostLead[] = (leadsRes.data ?? []) as ClosedLostLead[];
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.est_project_value) || 0), 0);

  return (
    <div className="space-y-10">
      <Hero leadCount={kpisRes.totalLeads} latentValue={kpisRes.latentValue} />
      <WorkflowStrip />
      <KpiRow kpis={kpisRes} />
      <LeadsSection
        leads={leads}
        status={status}
        totalValue={totalValue}
      />
    </div>
  );
}

function Hero({ leadCount, latentValue }: { leadCount: number; latentValue: number }) {
  return (
    <section className="space-y-3">
      <p className="section-eyebrow">Closed-Lost Reactivation Control Center</p>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
        Turn stale GHL leads into reviewed, personalized follow-ups.
      </h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-body-text)]">
        This is the approval console for Marcus and the office team. AI drafts the SMS, email, and call opener for each
        cold lead in his voice. Nothing leaves the building until a human approves it. Hot replies ping Telegram immediately.
      </p>
      <p className="text-[13px] text-[var(--color-muted)]">
        {leadCount.toLocaleString()} cold leads in the pipeline · ~${Math.round(latentValue).toLocaleString()} of latent project value
      </p>
    </section>
  );
}

function WorkflowStrip() {
  const steps: Array<{ n: number; title: string; copy: string; href: string; cta: string }> = [
    {
      n: 1,
      title: 'Generate reactivation drafts',
      copy: 'Pick high-value cold leads. AI writes a personal SMS, email, and call opener in Marcus’s voice.',
      href: '#leads',
      cta: 'Pick leads ↓',
    },
    {
      n: 2,
      title: 'Approve outreach',
      copy: 'Review every draft. Edit if needed. Approving queues messages to the outbox and pings Telegram.',
      href: '/queue',
      cta: 'Open queue →',
    },
    {
      n: 3,
      title: 'Follow up on hot replies',
      copy: 'Inbound replies are auto-classified hot / warm / not interested. Hot replies alert the team to call back.',
      href: '/replies',
      cta: 'See replies →',
    },
  ];
  return (
    <section aria-label="Workflow" className="card grid gap-0 md:grid-cols-3">
      {steps.map((s, i) => (
        <div
          key={s.n}
          className={
            'flex flex-col gap-3 p-6 ' +
            (i < steps.length - 1 ? 'md:border-r md:border-[var(--color-hairline-soft)]' : '')
          }
        >
          <div className="flex items-center gap-2.5">
            <span className={`step-pill ${s.n === 1 ? 'step-pill-active' : ''}`}>{s.n}</span>
            <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{s.title}</h3>
          </div>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-body-text)]">{s.copy}</p>
          <Link href={s.href} className="text-[13px] font-medium text-rausch hover:underline">
            {s.cta}
          </Link>
        </div>
      ))}
    </section>
  );
}

function KpiRow({ kpis }: { kpis: KpiResult }) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Closed-lost leads" value={kpis.totalLeads} hint="In the cold pile" />
      <KpiCard label="Drafts pending approval" value={kpis.draftsPending} hint="Need Marcus’s review" highlight={kpis.draftsPending > 0} href="/queue" />
      <KpiCard label="Approved outbox messages" value={kpis.outboxQueued + kpis.outboxSent} hint={`${kpis.outboxQueued} queued · ${kpis.outboxSent} sent (simulated)`} href="/outbox" />
      <KpiCard label="Hot replies" value={kpis.hotReplies} hint="Telegram-alerted" highlight={kpis.hotReplies > 0} href="/replies" />
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={
        'rounded-[14px] border px-5 py-4 transition ' +
        (highlight
          ? 'border-[var(--color-rausch)] bg-[var(--color-rausch-soft)]'
          : 'border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-soft)]')
      }
    >
      <p className="section-eyebrow">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tabular-nums text-[var(--color-ink)] leading-none">{value.toLocaleString()}</p>
      <p className="mt-1.5 text-[12.5px] text-[var(--color-muted)]">{hint}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function LeadsSection({
  leads,
  status,
  totalValue,
}: {
  leads: ClosedLostLead[];
  status: 'all' | LeadStatus;
  totalValue: number;
}) {
  return (
    <section id="leads" className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-hairline-soft)] px-6 py-5">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">Step 1 · Pick leads to reactivate</h2>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Showing {leads.length} lead{leads.length === 1 ? '' : 's'} · est. value ${Math.round(totalValue).toLocaleString()} ·
            check the boxes for the leads you want drafts for, then click Generate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/' : `/?status=${f.key}`}
              className={`filter-pill ${f.key === status ? 'filter-pill-active' : ''}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </header>

      {leads.length === 0 ? (
        <div className="px-6 py-10">
          <div className="empty-state">
            <h3>No leads in this filter</h3>
            <p>
              Switch the filter back to <Link href="/" className="text-rausch hover:underline">All</Link> to see the cold pile.
            </p>
          </div>
        </div>
      ) : (
        <form action={generateDraftsForm}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="bg-[var(--color-surface-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="w-10 px-6 py-3" />
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">City</th>
                  <th className="px-3 py-3 font-semibold">Project</th>
                  <th className="px-3 py-3 font-semibold">Est. value</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Reason lost</th>
                  <th className="px-3 py-3 font-semibold">Cold for</th>
                  <th className="px-3 py-3 font-semibold">Attempts</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const eligible =
                    lead.attempt_count < 3 &&
                    lead.status !== 'do_not_contact' &&
                    lead.status !== 'max_attempts_reached';
                  const months = lead.last_touchpoint_at
                    ? Math.round(
                        (Date.now() - new Date(lead.last_touchpoint_at).getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      )
                    : null;
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-[var(--color-hairline-soft)] align-top hover:bg-[var(--color-surface-soft)]"
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          name="leadId"
                          value={lead.id}
                          disabled={!eligible}
                          className="h-4 w-4 cursor-pointer rounded border-[var(--color-hairline)] accent-[var(--color-rausch)]"
                          aria-label={`Select ${lead.first_name} ${lead.last_name ?? ''}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-[var(--color-ink)]">
                        <Link href={`/leads/${lead.id}`} className="hover:underline">
                          {lead.first_name} {lead.last_name ?? ''}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[var(--color-body-text)]">{lead.city ?? '-'}</td>
                      <td className="px-3 py-3 text-[var(--color-body-text)]">{lead.project_type ?? '-'}</td>
                      <td className="px-3 py-3 tabular-nums font-medium text-[var(--color-ink)]">
                        {lead.est_project_value
                          ? `$${Math.round(Number(lead.est_project_value)).toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-3 text-[var(--color-body-text)]">{lead.reason_lost ?? '-'}</td>
                      <td className="px-3 py-3 text-[var(--color-body-text)]">{months !== null ? `${months}mo` : '-'}</td>
                      <td className="px-3 py-3 tabular-nums text-[var(--color-body-text)]">{lead.attempt_count}/3</td>
                      <td className="px-3 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-[13px] font-medium text-rausch hover:underline">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-6 py-4">
            <p className="text-[13px] text-[var(--color-muted)]">
              Eligibility: less than 3 attempts and not opted out. Each generation costs ~$0.005 with gpt-4.1-mini.
            </p>
            <button type="submit" className="btn-primary">
              Generate reactivation drafts
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge status-${status}`}>{status.replace(/_/g, ' ')}</span>;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
      <p className="font-semibold">Error loading data</p>
      <p className="mt-1 text-sm">{message}</p>
      <p className="mt-3 text-xs text-rose-700">
        Check that <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> are set, and that
        the schema in <code>supabase/schema.sql</code> has been applied.
      </p>
    </div>
  );
}

interface KpiResult {
  totalLeads: number;
  latentValue: number;
  draftsPending: number;
  outboxQueued: number;
  outboxSent: number;
  hotReplies: number;
}

async function getKpis(supabase: ReturnType<typeof getServerClient>): Promise<KpiResult> {
  const [leadsRes, draftsRes, outboxRes, repliesRes] = await Promise.all([
    supabase.from('closed_lost_leads').select('est_project_value, status'),
    supabase.from('outreach_drafts').select('status').eq('status', 'pending'),
    supabase.from('outbox_messages').select('status'),
    supabase.from('reply_events').select('classification').eq('classification', 'hot'),
  ]);
  const leads = (leadsRes.data ?? []) as Array<{ est_project_value: number | null; status: string }>;
  const outbox = (outboxRes.data ?? []) as Array<{ status: string }>;
  return {
    totalLeads: leads.length,
    latentValue: leads.reduce((s, l) => s + (Number(l.est_project_value) || 0), 0),
    draftsPending: (draftsRes.data ?? []).length,
    outboxQueued: outbox.filter((m) => m.status === 'queued').length,
    outboxSent: outbox.filter((m) => m.status === 'sent_simulated').length,
    hotReplies: (repliesRes.data ?? []).length,
  };
}
