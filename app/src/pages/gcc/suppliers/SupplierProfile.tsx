import { useCallback, useMemo, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { supplierDetailFor, type SupplierDetailVM } from '@/domain/gcc/suppliers/detail';
import { HEALTH_RULE_TEXT } from '@/domain/gcc/suppliers/health';
import { latestNcrQuarter, worstQuarter } from '@/domain/gcc/suppliers/performance';
import { PREQUAL_LABEL, SCREENING_TONE } from '@/domain/gcc/suppliers/profile';
import { dayMonth, dayMonthYear, plural } from '@/domain/gcc/s1/common';
import { DEMO_TODAY } from '@/domain/calendar';
import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';
import { Card } from '@/components/ui/primitives';
import { KpiTiles } from '@/components/dashboard/KpiTile';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { Callout } from '@/components/tender/Callout';
import { DemoTag } from '@/components/tender/DemoTag';
import { Tabs, tabPanelProps, type TabItem } from '@/components/tender/Tabs';
import { useS1 } from '../s1/vm/useS1';
import { kpiCtxOf, valueTile } from '../s1/vm/tiles';
import { usePortalPreview } from '../s2/portalLink';
import { OverviewTab } from './profile/OverviewTab';
import { FinancialsTab } from './profile/FinancialsTab';
import { ProjectsTab } from './profile/ProjectsTab';
import { PerformanceTab } from './profile/PerformanceTab';
import { ComplianceTab } from './profile/ComplianceTab';
import { ContactsTab } from './profile/ContactsTab';
import '@/components/dashboard/dashboard.css';
import '../s1/s1.css';
import './suppliers.css';
import './profile.css';

/**
 * A supplier's full profile (`/suppliers/:id`, plan 031): everything a
 * procurement lead needs to decide whether to give it a package. The header
 * (name, screening, prequalification, load), a blocked supplier's block in
 * words, six tiles that agree with the master's row, and six tabs (`?tab=`).
 * Back returns to the master with its filters (history back, else
 * `/suppliers`). Read only: it adds no demo state.
 */

const HERE = '/suppliers';
const PREFIX = 'supplier';
type TabId = 'overview' | 'financials' | 'projects' | 'performance' | 'compliance' | 'contacts';
const TAB_IDS: TabId[] = ['overview', 'financials', 'projects', 'performance', 'compliance', 'contacts'];
const LABEL: Record<TabId, string> = {
  overview: 'Overview', financials: 'Financials', projects: 'Projects with us', performance: 'Performance', compliance: 'Compliance', contacts: 'Contacts & documents',
};
const tabOf = (want: string | null): TabId => ((TAB_IDS as string[]).includes(want ?? '') ? (want as TabId) : 'overview');

/** "Screened 18 Nov 2025", as the master's column reads it. */
const screeningText = (d: SupplierDetailVM) => (d.row.sc.state === 'current' ? `Screened ${dayMonthYear(d.row.sc.lastChecked.slice(0, 10))}` : d.row.sc.label);

function tilesOf(d: SupplierDetailVM, ctx: ReturnType<typeof kpiCtxOf>): TileVM[] {
  const s = d.row.s;
  const t = d.totals;
  const here = `${HERE}/${encodeURIComponent(d.id)}`;
  const drill = (tab: TabId, label: string): DrillVM => ({ kind: 'route', to: `${here}?tab=${tab}`, label });
  const awards = d.jobsNow.length + d.delivered.length;
  const latestAward = [...d.jobsNow, ...d.delivered].map((j) => j.awardedAt).sort().pop();
  const worst = worstQuarter(d.quarters);
  const lastNcr = latestNcrQuarter(d.quarters);
  const nextDue = d.jobsNow[0]?.dueAt;
  const span = `${d.quarters[0].key} to ${d.quarters[d.quarters.length - 1].key}`;
  const fy = d.health.fy;
  const cr = fy.currentRatio.toFixed(2);
  const nm = fy.netMarginPct.toFixed(1);
  const days = s.response.avgDays;
  const { overdueSince: late, nextBy } = d.openReplies;
  return [
    valueTile('supplier.awards', 'Our awards (12 m)', String(awards), {
      kind: 'flow', means: 'Packages you awarded this supplier on tenders you won, in the last 12 months.',
      counted: 'Every award in the period: the jobs still in progress and those already delivered. The same figure as the supplier master.', target: 'None (information)', source: 'Awards on won tenders',
    }, ctx, {
      sub: `${plural(awards, 'award')}: ${d.jobsNow.length} in progress, ${d.delivered.length} delivered`, detail: `${d.jobsNow.length} now · ${d.delivered.length} delivered`,
      ref: { k: 'Latest', v: latestAward ? dayMonth(latestAward) : 'None' }, drill: drill('projects', 'Show its projects with us'),
    }),
    valueTile('supplier.ontime', 'On-time delivery', t.onTimePct === null ? 'No deliveries' : `${t.onTimePct}%`, {
      kind: 'flow', means: 'Deliveries it made to you by the promised date, over the last four quarters.',
      counted: `On-time deliveries over all deliveries, ${span}, weighted by deliveries. Call-offs on earlier orders count.`, target: 'None (information)', source: 'Delivery records',
    }, ctx, {
      sub: `${t.onTime} of ${plural(t.deliveries, 'delivery', 'deliveries')} on time`, detail: `${t.onTime} of ${t.deliveries} on time`,
      ref: { k: 'Worst', v: worst ? `${worst.key}, ${worst.onTimePct}%` : 'None' }, drill: drill('performance', 'Show its performance'),
    }),
    valueTile('supplier.ncrs', 'NCRs (12 m)', String(t.ncrs), {
      kind: 'flow', means: 'Non-conformance reports raised against its deliveries.', counted: `NCRs raised ${span}.`, target: 'None (information)', source: 'Quality records',
    }, ctx, {
      sub: `${plural(t.ncrs, 'NCR')} over ${plural(t.deliveries, 'delivery', 'deliveries')}`, detail: `Over ${plural(t.deliveries, 'delivery', 'deliveries')}`,
      ref: { k: 'Latest', v: lastNcr ? lastNcr.key : 'None' }, drill: drill('performance', 'Show its performance'),
    }),
    valueTile('supplier.replies', 'RFQ replies', `${s.response.ratePct}%`, {
      kind: 'flow', means: 'The share of your RFQs it answers, with a quote or a decline, and how quickly.',
      counted: 'The supplier master’s figure for the last 12 months, not a sum of the quarters on Performance.', target: 'None (information)', source: 'Supplier master',
    }, ctx, {
      sub: `Replies to ${s.response.ratePct}% of RFQs, in ${plural(days, 'day')} on average`, detail: `Replies in ${plural(days, 'day')}`,
      ref: late ? { k: 'Oldest', v: `overdue since ${dayMonth(late.slice(0, 10))}` } : { k: 'Next', v: nextBy ? `reply by ${dayMonth(nextBy.slice(0, 10))}` : 'None' },
      drill: drill('projects', 'Show its quotes with us'),
    }),
    valueTile('supplier.now', 'Working for us now', String(d.jobsNow.length), {
      kind: 'state', means: `Jobs it is doing for you now, on tenders you won in the last 12 months. ${d.load.sentence}.`,
      counted: 'Awards still in progress today. Load is the supplier’s whole order book, across all its clients, as the supplier master records it; your jobs are part of it.',
      target: 'None (information)', source: 'Awards on won tenders · supplier master',
    }, ctx, {
      sub: d.load.sentence, detail: `Load ${d.load.label}, all clients`,
      ref: { k: 'Next', v: nextDue ? `due ${nextDue.slice(0, 4) === DEMO_TODAY.slice(0, 4) ? dayMonth(nextDue) : dayMonthYear(nextDue)}` : 'None' }, drill: drill('projects', 'Show its projects with us'),
    }),
    valueTile('supplier.health', 'Financial health', d.health.word, {
      kind: 'state', means: 'How sound its finances are, as one word from one rule.', counted: `${HEALTH_RULE_TEXT} Read from its latest financial year.`,
      target: 'Strong or Adequate for a critical package', source: 'Supplier accounts',
    }, ctx, {
      sub: `FY${fy.fy}: current ratio ${cr}, net margin ${nm}%`, detail: `Ratio ${cr} · margin ${nm}%`,
      ref: { k: 'Latest', v: `FY${fy.fy} accounts` }, drill: drill('financials', 'Show its financials'),
    }),
  ];
}

function BackBar({ onBack, children }: { onBack(): void; children?: ReactNode }) {
  return (
    <div className="spf-top">
      <button type="button" className="spf-back" onClick={onBack}><ChevronLeft size={14} aria-hidden />Suppliers</button>
      <span className="spf-top-r">{children}</span>
    </div>
  );
}

export default function SupplierProfile() {
  const { id = '' } = useParams();
  const s1 = useS1();
  const { tenant, viewer, viewAs, done } = s1;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preview = usePortalPreview();
  const d = useMemo(() => supplierDetailFor(tenant, id, done, viewer), [tenant, id, done, viewer]);
  const active = tabOf(params.get('tab'));

  const openTab = useCallback((tab: string) => {
    setParams(() => { const n = new URLSearchParams(); if (tab !== 'overview') n.set('tab', tab); return n; }, { replace: true });
  }, [setParams]);
  // History back keeps the master's filters and open sheet; a profile opened by link goes to the master.
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate(HERE));

  if (!d) {
    return (
      <div className="view s1 spf">
        <BackBar onBack={back} />
        <Card>
          <EmptyState title="No supplier with this ID in your supplier master." body={<>Nothing is held for <span className="mono">{id}</span>. It may belong to another company, or the link is out of date.</>}
            action={<Link to={HERE} className="btn btn-sm">Open the supplier master</Link>} />
        </Card>
      </div>
    );
  }

  const s = d.row.s;
  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, '12m', 'supplier-profile');
  const tiles = tilesOf(d, ctx);
  const prequal = PREQUAL_LABEL[s.prequal];
  // The portal preview opens at an RFQ still waiting for the supplier's reply, if there is one (as the sheet does).
  const rfq = d.sheet.rfqs.find((r) => r.shortTitle !== null && (r.state === 'due' || r.state === 'overdue')) ?? d.sheet.rfqs.find((r) => r.shortTitle !== null);
  const expired = d.certificates.filter((c) => c.state === 'expired').length;
  const soon = d.certificates.filter((c) => c.state === 'soon').length;
  const tabs: TabItem[] = TAB_IDS.map((tid) => ({
    id: tid, label: LABEL[tid],
    badge: tid !== 'compliance' ? null
      : d.block ? { text: 'Blocked', tone: 'red' }
      : expired ? { text: `${expired} expired`, tone: 'red' }
      : d.row.sc.state === 'due' ? { text: 'Screening due', tone: 'orange' }
      : soon ? { text: `${soon} to renew`, tone: 'orange' } : null,
  }));
  const avl = s.avl.length ? `On ${plural(s.avl.length, 'approved-vendor list')}` : 'On no approved-vendor list';

  return (
    <div className="view s1 spf">
      <BackBar onBack={back}>
        {d.portalUser && (
          <span className="req-wrap">
            <button type="button" className="btn btn-sm" disabled={!!preview.blocked || !rfq} aria-describedby={preview.blocked || !rfq ? 'spf-portal-why' : undefined}
              title={rfq ? `Demo control: switches to ${d.portalUser.name.split(' ')[0]} and opens ${rfq.packageId} of ${rfq.tenderId}` : undefined}
              onClick={() => rfq && preview.open(rfq.id, d.portalUser!.id)}>
              <ExternalLink size={12} aria-hidden />Supplier Portal preview <DemoTag />
            </button>
            {(preview.blocked || !rfq) && <span className="req-why" id="spf-portal-why">{preview.blocked ?? 'Opens at an RFQ, and none is open with this supplier'}</span>}
          </span>
        )}
      </BackBar>

      <header className="spf-head">
        <div className="spf-title">
          <h2 className="spf-name">{s.name}</h2>
          <span className="spf-pills">
            <StatusPill label={screeningText(d)} tone={SCREENING_TONE[d.row.sc.state]} icon={d.row.sc.state === 'current' ? '✓' : '!'} />
            <StatusPill label={prequal.label} tone={prequal.tone} />
            {s.national && <StatusPill label="National product" tone="cyan" />}
            <StatusPill label={d.load.sentence} tone={d.load.tone} />
          </span>
        </div>
        <p className="spf-line">
          {d.company.hq} · {d.row.trades.join(', ')} · Est. <span className="num">{d.company.established}</span> · <span className="num">{d.company.staff.toLocaleString('en-GB')}</span> staff · {avl}
        </p>
      </header>

      {d.block && (
        <Callout variant="block" title={`${d.block.label}: it can never be put on a shortlist or sent an RFQ.`}>
          {d.risk ?? `${d.row.sc.reason}.`} Raised by the {d.block.kind === 'sanctions' ? 'sanctions' : 'anti-bribery'} check of {dayMonthYear(d.block.at)}.
        </Callout>
      )}

      <div className="s1-strip">
        <KpiTiles tiles={tiles} onDrill={(dr) => { if (dr.kind === 'route') openTab(new URLSearchParams(dr.to.split('?')[1] ?? '').get('tab') ?? 'overview'); }} />
      </div>

      <div className="spf-tabs">
        <Tabs tabs={tabs} active={active} onChange={openTab} label={`${s.name}: profile sections`} prefix={PREFIX} />
      </div>
      <div className="spf-panel" {...tabPanelProps(PREFIX, active)}>
        {active === 'overview' && <OverviewTab d={d} onTab={openTab} />}
        {active === 'financials' && <FinancialsTab d={d} onTab={openTab} />}
        {active === 'projects' && <ProjectsTab d={d} onTab={openTab} />}
        {active === 'performance' && <PerformanceTab d={d} onTab={openTab} />}
        {active === 'compliance' && <ComplianceTab d={d} onTab={openTab} />}
        {active === 'contacts' && <ContactsTab d={d} onTab={openTab} />}
      </div>
    </div>
  );
}
