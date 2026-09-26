import type { ReactNode } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { Tone } from '@/data/types';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { personById } from '@/data/people';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import { addHours } from '@/domain/gcc/clock';
import { useTenantKey } from '@/domain/tenancy';
import { Masked } from '@/components/tender/Masked';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { SlaClock } from '@/components/tender/SlaClock';
import { StatusPill } from '@/components/tender/StatusPill';
import type { AgColDef, ColumnDef } from './types';

/**
 * The stage tables' own columns (plan 013 Phase 4, dashboards.md §10.4–10.12),
 * prefixed by stage. Each reads the step facts the lifecycle port emits
 * (`row.facts`, plan 017's keys) and formats them with the tender kit: counts
 * "7 / 11", percentages "88%", money through `Money`, dates through `When`,
 * time limits through `SlaClock`, states through `StatusPill`, and masked
 * facts through `Masked`. Value getters return raw, sortable values.
 */

type P = ICellRendererParams<TenderRowVM>;
type Facts = TenderRowVM['facts'];
type V = string | number | boolean | null | undefined;

const num = (v: V): number | null => (typeof v === 'number' ? v : null);
const str = (v: V): string | null => (typeof v === 'string' ? v : null);
const isMasked = (f: Facts, ...keys: string[]) => keys.some((k) => f[`${k}.masked`]);

const sub = (text: string) => <span className="tk-sub">{text}</span>;
const n = (v: number | string, tone?: Tone) => <span className={`num ${tone ? `t-${tone}` : ''}`}>{typeof v === 'number' ? v.toLocaleString('en-GB') : v}</span>;
const two = (main: ReactNode, second?: string | null) => (
  <span className="cell-two"><span className="tk-main">{main}</span>{second && <span className="tk-sub">{second}</span>}</span>
);

function MoneyCell({ amount }: { amount: number }) {
  const tenant = useTenantKey();
  if (!isGccTenantKey(tenant)) return n(amount);
  return <Money value={{ amount, ccy: gccData(tenant).fit.band.min.ccy }} />;
}

/** "10 Mar". */
const dayMonth = (iso: string) => dateText(iso.slice(0, 10)).split(' ').slice(1, 3).join(' ');

const dateCell = (iso: string | null, empty: string, tone?: Tone) => (iso ? <When date={iso.slice(0, 10)} time={iso.length > 10 ? iso.slice(11, 16) : undefined} short tone={tone} /> : sub(empty));

interface Spec {
  id: string;
  header: string;
  width?: number;
  kind?: 'number' | 'text';
  value(r: TenderRowVM): string | number | null;
  cell(r: TenderRowVM): ReactNode;
}

const col = (s: Spec): ColumnDef => ({
  id: s.id, header: s.header,
  build: (): AgColDef => ({
    headerName: s.header, width: s.width ?? 140,
    ...(s.kind === 'number' ? { type: 'rightAligned', filter: 'agNumberColumnFilter' } : {}),
    valueGetter: (p) => (p.data ? s.value(p.data) : null),
    cellRenderer: (p: P) => (p.data ? s.cell(p.data) : null),
  }),
});

/** "7 / 11": a part of a whole. */
const ofCol = (id: string, header: string, part: string, whole: string, width = 130) => col({
  id, header, width, kind: 'number',
  value: (r) => { const a = num(r.facts[part]); const b = num(r.facts[whole]); return a !== null && b ? a / b : null; },
  cell: (r) => (isMasked(r.facts, part) ? <Masked /> : num(r.facts[part]) === null ? sub('Not stated') : n(`${r.facts[part]} / ${r.facts[whole]}`)),
});

/** A count, orange or red when above zero. */
const countCol = (id: string, header: string, key: string, over?: Tone, width = 120) => col({
  id, header, width, kind: 'number',
  value: (r) => num(r.facts[key]),
  cell: (r) => (isMasked(r.facts, key) ? <Masked /> : num(r.facts[key]) === null ? sub('Not stated') : n(num(r.facts[key])!, over && num(r.facts[key])! > 0 ? over : undefined)),
});

const pctCol = (id: string, header: string, key: string, tone?: (v: number, f: Facts) => Tone | undefined, width = 120) => col({
  id, header, width, kind: 'number',
  value: (r) => num(r.facts[key]),
  cell: (r) => {
    if (isMasked(r.facts, key)) return <Masked />;
    const v = num(r.facts[key]);
    return v === null ? sub('Not stated') : n(`${v}%`, tone?.(v, r.facts));
  },
});

const dateCol = (id: string, header: string, key: string, empty = 'Not set', pastTone?: Tone, width = 150) => col({
  id, header, width,
  value: (r) => str(r.facts[key]),
  cell: (r) => { const v = str(r.facts[key]); return dateCell(v, empty, v && pastTone && v.slice(0, 10) < DEMO_TODAY ? pastTone : undefined); },
});

const moneyCol = (id: string, header: string, key: string, width = 140) => col({
  id, header, width, kind: 'number',
  value: (r) => num(r.facts[key]),
  cell: (r) => (isMasked(r.facts, key) ? <Masked /> : num(r.facts[key]) === null ? sub('Not stated') : <MoneyCell amount={num(r.facts[key])!} />),
});

/** An SLA from its end time: `SlaClock` over the gate's time limit. */
const slaCol = (id: string, header: string, key: string, gate: keyof typeof GATE_SLA_HOURS, empty: (r: TenderRowVM) => string, width = 190) => col({
  id, header, width,
  value: (r) => str(r.facts[key]),
  cell: (r) => { const end = str(r.facts[key]); return end ? <SlaClock start={addHours(end, -GATE_SLA_HOURS[gate])} end={end} /> : sub(empty(r)); },
});

const bidManagerCol = (id: string) => col({
  id, header: 'Bid Manager', width: 170,
  value: (r) => personById(r.bidManagerId)?.name ?? '',
  cell: (r) => (personById(r.bidManagerId) ? personById(r.bidManagerId)!.name : sub('Not assigned')),
});

const pill = (label: string, tone: Tone) => <StatusPill label={label} tone={tone} />;

export const COLUMNS: ColumnDef[] = [
  /* ------------------------------------------------------ Stage 1 · Intake */
  col({
    id: 's1.fields', header: 'Fields to check', width: 150, kind: 'number',
    value: (r) => num(r.facts.fieldsToCheck),
    cell: (r) => {
      const all = num(r.facts.fieldsToCheck) ?? 0;
      const blocking = num(r.facts.fieldsBlocking) ?? 0;
      if (!all) return sub('None');
      return blocking ? two(n(all, 'red'), `${blocking} block DG1`) : n(all);
    },
  }),
  col({
    id: 's1.eligibility', header: 'Eligibility', width: 190,
    value: (r) => (num(r.facts.eligPass) === null ? null : (num(r.facts.eligFail) ?? 0) * 1000 + (num(r.facts.eligAtRisk) ?? 0)),
    cell: (r) => {
      const pass = num(r.facts.eligPass);
      if (pass === null) return sub('Not checked yet');
      const risk = num(r.facts.eligAtRisk) ?? 0;
      const fail = num(r.facts.eligFail) ?? 0;
      return (
        <span className="num">
          {pass} pass · <span className={risk ? 't-orange' : ''}>{risk} at risk</span> · <span className={fail ? 't-red' : ''}>{fail} fail</span>
        </span>
      );
    },
  }),
  col({
    id: 's1.documents', header: 'Documents', width: 160,
    value: (r) => str(r.facts.purchaseBy) ?? (r.facts.documents === 'downloaded' ? '9999' : null),
    cell: (r) => {
      if (r.facts.documents === 'downloaded') return 'Bought';
      const fee = num(r.facts.documentFee);
      const by = str(r.facts.purchaseBy);
      if (fee === null) return sub('Not stated');
      return two(<MoneyCell amount={fee} />, by ? `buy by ${dayMonth(by)}` : null);
    },
  }),
  col({ id: 's1.language', header: 'Language', width: 110, value: (r) => str(r.facts.language), cell: (r) => str(r.facts.language) ?? sub('Not stated') }),
  slaCol('s1.dg1Due', 'DG1 due', 'dg1Due', 'DG1', () => 'Not due yet'),

  /* ---------------------------------------------------- Stage 2 · Sourcing */
  ofCol('s2.covered', 'Packages covered', 'packagesCovered', 'packagesTotal', 150),
  col({
    id: 's2.issued', header: 'Packages issued', width: 160, kind: 'number',
    value: (r) => num(r.facts.rfqsSent),
    cell: (r) => {
      const sent = num(r.facts.rfqsSent);
      const total = num(r.facts.rfqsTotal);
      const pkgs = num(r.facts.packagesTotal);
      if (sent === null || total === null) return sub('Not stated');
      if (total === 0) return sub('No RFQs yet');
      // Every RFQ sent means every package is issued; until then the facts carry RFQ counts only.
      return sent === total && total > 0 && pkgs ? two(n(`${pkgs} / ${pkgs}`), `${sent} RFQs`) : two(n(`${sent} of ${total}`), 'RFQs sent');
    },
  }),
  col({
    id: 's2.overdue', header: 'Overdue RFQs', width: 140, kind: 'number',
    value: (r) => num(r.facts.rfqsOverdue),
    cell: (r) => {
      const o = num(r.facts.rfqsOverdue) ?? 0;
      const e = num(r.facts.rfqsEscalated) ?? 0;
      return o ? two(n(o, e ? 'red' : 'orange'), e ? `${e} escalated` : null) : sub('None');
    },
  }),
  countCol('s2.toLevel', 'To level', 'toLevel'),
  pctCol('s2.notCovered', 'Not covered', 'notCoveredPct', (v) => (v > 5 ? 'red' : v > 0 ? 'orange' : undefined), 130),
  dateCol('s2.repliesDue', 'Replies due', 'repliesDue'),
  bidManagerCol('s2.bidManager'),

  /* ------------------------------------------------ Stage 3 · Bid decision */
  col({
    id: 's3.margin', header: 'Margin range', width: 140, kind: 'number',
    value: (r) => num(r.facts.marginMin),
    cell: (r) => (isMasked(r.facts, 'marginMin') ? <Masked /> : num(r.facts.marginMin) === null ? sub('Not stated') : n(`${r.facts.marginMin}–${r.facts.marginMax}%`)),
  }),
  moneyCol('s3.facility', 'Facility after bond', 'facilityAfter', 160),
  col({
    id: 's3.positions', header: 'Positions', width: 120, kind: 'number',
    value: (r) => num(r.facts.positionsRecorded),
    cell: (r) => (isMasked(r.facts, 'positionsRecorded') ? <Masked /> : num(r.facts.positionsRecorded) === null ? sub('Not stated') : n(`${r.facts.positionsRecorded} of ${r.facts.positionsOf}`)),
  }),
  col({
    id: 's3.quorum', header: 'Quorum', width: 150,
    value: (r) => str(r.facts.quorum),
    cell: (r) => {
      if (isMasked(r.facts, 'quorum')) return <Masked />;
      const q = str(r.facts.quorum);
      return !q ? sub('Not stated') : q === 'met' ? pill('Met', 'green') : pill(q.replace(/^./, (c) => c.toUpperCase()), 'orange');
    },
  }),
  slaCol('s3.dg2Sla', 'DG2 SLA', 'dg2SlaEnd', 'DG2', (r) => (r.facts.pack === 'in preparation' ? 'Pack not issued' : 'Not open')),
  col({
    id: 's3.pack', header: 'Pack', width: 140,
    value: (r) => str(r.facts.pack),
    cell: (r) => {
      const p = str(r.facts.pack);
      return p === 'fresh' ? pill('Fresh', 'green') : p === 'stale' ? pill('Stale', 'red') : p ? pill('In preparation', 'grey') : sub('No pack yet');
    },
  }),
  bidManagerCol('s3.bidManager'),

  /* ---------------------------------------------------- Stage 4 · Planning */
  col({
    id: 's4.duration', header: 'Duration', width: 170, kind: 'number',
    value: (r) => { const a = num(r.facts.durationPlannedM); const b = num(r.facts.durationRequiredM); return a !== null && b !== null ? a - b : null; },
    cell: (r) => {
      const a = num(r.facts.durationPlannedM);
      const b = num(r.facts.durationRequiredM);
      return a === null || b === null ? sub('Not stated') : two(n(`${a} vs ${b} months`, a > b ? 'red' : undefined), a > b ? 'over the time allowed' : 'planned vs required');
    },
  }),
  col({
    id: 's4.float', header: 'Float', width: 110, kind: 'number',
    value: (r) => num(r.facts.floatDays),
    cell: (r) => { const v = num(r.facts.floatDays); return v === null ? sub('Not stated') : n(`${v < 0 ? `−${-v}` : v} days`, v < 0 ? 'red' : undefined); },
  }),
  countCol('s4.longLead', 'Long-lead at risk', 'longLeadAtRisk', 'red', 150),
  countCol('s4.manpower', 'Peak manpower', 'peakManpower', undefined, 140),
  dateCol('s4.baselineDue', 'Baseline due', 'baselineDue', 'Not set', 'red'),
  dateCol('s4.m2Due', 'M2 due', 'm2Due'),

  /* ----------------------------------------------------- Stage 5 · Pricing */
  moneyCol('s5.price', 'Estimated price', 'estPrice', 150),
  pctCol('s5.margin', 'Base margin', 'baseMarginPct', (v, f) => (num(f.minMarginPct) !== null && v < num(f.minMarginPct)! ? 'red' : undefined), 130),
  pctCol('s5.minMargin', 'Minimum margin', 'minMarginPct', undefined, 140),
  pctCol('s5.sourced', 'Sourced', 'sourcedPct', (v) => (v >= 95 ? undefined : v >= 85 ? 'orange' : 'red')),
  pctCol('s5.estimated', 'Estimated', 'estimatedPct', (v) => (v <= 5 ? undefined : v <= 10 ? 'orange' : 'red')),
  col({
    id: 's5.finance', header: 'Finance check', width: 140,
    value: (r) => str(r.facts.financeCheck),
    cell: (r) => (r.facts.financeCheck === 'confirmed' ? pill('Confirmed', 'green') : r.facts.financeCheck === 'pending' ? pill('Pending', 'orange') : sub('Not stated')),
  }),
  dateCol('s5.m2Due', 'M2 due', 'm2Due'),

  /* ---------------------------------------------------- Stage 6 · Proposal */
  ofCol('s6.sections', 'Sections locked', 'sectionsLocked', 'sectionsTotal', 150),
  countCol('s6.late', 'Late sections', 'sectionsLate', 'orange', 130),
  col({
    id: 's6.score', header: 'Simulated score', width: 150, kind: 'number',
    value: (r) => { const s = num(r.facts.simScore); const p = num(r.facts.passMark); return s !== null && p !== null ? s - p : null; },
    cell: (r) => {
      const s = num(r.facts.simScore);
      const p = num(r.facts.passMark);
      return s === null || p === null ? sub('Not scored') : two(n(`${s} vs ${p}`, s < p ? 'red' : undefined), s < p ? 'below the pass mark' : 'vs pass mark');
    },
  }),
  countCol('s6.sme', 'SME tasks overdue', 'smeOverdue', 'orange', 150),
  dateCol('s6.redTeam', 'Red-team review', 'redTeamAt', 'Not booked', undefined, 170),

  /* -------------------------------------------------- Stage 7 · Compliance */
  pctCol('s7.evidenced', 'Evidenced', 'evidencedPct', (v) => (v < 100 ? 'orange' : undefined)),
  countCol('s7.gaps', 'Mandatory gaps', 'mandatoryGaps', 'red', 140),
  countCol('s7.redlines', 'Redlines open', 'redlinesOpen', 'orange', 130),
  countCol('s7.risks', 'Risks without owner', 'risksWithoutOwner', 'red', 160),
  slaCol('s7.dg3', 'DG3', 'dg3SlaEnd', 'DG3', () => 'Pack not issued'),

  /* -------------------------------------------------- Stage 8 · Submission */
  col({
    id: 's8.deadline', header: 'Deadline', width: 220,
    value: (r) => (r.submission ? `${r.submission.date}T${r.submission.time ?? '23:59'}` : null),
    cell: (r) => (r.submission ? <When date={r.submission.date} time={r.submission.time} short countdown={r.live && !r.facts.submittedAt} /> : sub('No deadline yet')),
  }),
  col({ id: 's8.portal', header: 'Portal', width: 130, value: (r) => str(r.facts.portal) ?? r.source.name, cell: (r) => str(r.facts.portal) ?? r.source.name }),
  pctCol('s8.ready', 'Package ready', 'packageReadyPct', (v) => (v >= 100 ? undefined : v >= 90 ? 'orange' : 'red'), 130),
  col({
    id: 's8.signatures', header: 'Signatures', width: 130, kind: 'number',
    value: (r) => num(r.facts.signaturesPending),
    cell: (r) => { const v = num(r.facts.signaturesPending); return v === null ? sub('Not stated') : v ? n(`${v} pending`, 'orange') : sub('All signed'); },
  }),
  col({
    id: 's8.bond', header: 'Bid bond', width: 170, kind: 'number',
    value: (r) => num(r.facts.bondAmount),
    cell: (r) => {
      if (r.facts.bondIssued === false) return n('Not issued', 'red');
      const to = str(r.facts.bondValidTo);
      const short = !!to && !!str(r.facts.bondRequiredTo) && to < str(r.facts.bondRequiredTo)!;
      const amount = isMasked(r.facts, 'bondAmount') ? <Masked /> : num(r.facts.bondAmount) === null ? sub('Not stated') : <MoneyCell amount={num(r.facts.bondAmount)!} />;
      return (
        <span className="cell-two">
          <span className="tk-main">{amount}</span>
          {to && <span className={`tk-sub ${short ? 't-red' : ''}`}>valid to {dayMonth(to)}{short ? ', too short' : ''}</span>}
        </span>
      );
    },
  }),
  col({
    id: 's8.receipt', header: 'Receipt', width: 150,
    value: (r) => str(r.facts.receipt) ?? str(r.facts.submittedAt),
    cell: (r) => (str(r.facts.receipt) ? <span className="tk-mono">{str(r.facts.receipt)}</span> : str(r.facts.submittedAt) ? dateCell(str(r.facts.submittedAt), '') : sub('Not submitted')),
  }),
  dateCol('s8.opening', 'Opening', 'openingDate', 'Not stated'),

  /* ----------------------------------------------------- Stage 9 · Results */
  col({
    id: 's9.result', header: 'Result', width: 120,
    value: (r) => str(r.facts.result),
    cell: (r) => (r.facts.result === 'won' ? pill('Won', 'green') : r.facts.result === 'lost' ? pill('Lost', 'grey') : sub('Awaiting')),
  }),
  col({
    id: 's9.rank', header: 'Our rank', width: 110, kind: 'number',
    value: (r) => num(r.facts.rankPlace),
    cell: (r) => (num(r.facts.rankPlace) === null ? sub('Not published') : n(`${r.facts.rankPlace} of ${r.facts.rankOf}`)),
  }),
  col({
    id: 's9.gap', header: 'Gap to winner', width: 130, kind: 'number',
    value: (r) => num(r.facts.gapToWinnerPct),
    cell: (r) => (r.facts.result === 'won' ? sub('We won') : num(r.facts.gapToWinnerPct) === null ? sub('Not published') : n(`${r.facts.gapToWinnerPct}%`)),
  }),
  col({
    id: 's9.lossReason', header: 'Loss reason', width: 150,
    value: (r) => str(r.facts.lossReason),
    cell: (r) => {
      const v = str(r.facts.lossReason);
      const label: Record<string, string> = { price: 'Price', technical: 'Technical score', 'local-content': 'Local content', pq: 'Prequalification', other: 'Other' };
      return v ? label[v] ?? v : sub(r.facts.result === 'won' ? 'Not applicable' : 'Not recorded');
    },
  }),
  pctCol('s9.predicted', 'Predicted at DG2', 'predictedWin', undefined, 150),
  col({
    id: 's9.lessons', header: 'Lessons', width: 120,
    value: (r) => (r.facts.lessons === true ? 1 : 0),
    cell: (r) => (r.facts.lessons ? pill('Captured', 'green') : sub('Not yet')),
  }),
];
