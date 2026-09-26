import type { ICellRendererParams } from 'ag-grid-community';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { useTenantKey } from '@/domain/tenancy';
import { Masked } from '@/components/tender/Masked';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import type { ColumnDef } from './types';

/**
 * A column for every step-fact key the lifecycle port emits (plan 017's
 * "Port facts keys", plan 020 B18), keyed by the fact key itself, so the
 * tender summary labels a fact with words and any table can show one.
 * Headers follow dashboards.md §10 where it names the column. Plan 013's
 * stage columns (`s1.fields` …) format the same facts for the stage tables.
 */

type P = ICellRendererParams<TenderRowVM>;
type Kind = 'count' | 'pct' | 'money' | 'date' | 'datetime' | 'text' | 'bool';

function MoneyCell({ amount }: { amount: number }) {
  const tenant = useTenantKey();
  if (!isGccTenantKey(tenant)) return <span className="num">{amount.toLocaleString('en-GB')}</span>;
  return <Money value={{ amount, ccy: gccData(tenant).fit.band.min.ccy }} />;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function cell(kind: Kind, id: string) {
  return (p: P) => {
    if (!p.data) return null;
    const v = p.data.facts[id];
    if (v === null || v === undefined) return p.data.facts[`${id}.masked`] ? <Masked /> : <span className="tk-sub">Not stated</span>;
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (kind === 'money' && typeof v === 'number') return <MoneyCell amount={v} />;
    if (kind === 'pct' && typeof v === 'number') return <span className="num">{v}%</span>;
    if (kind === 'count' && typeof v === 'number') return <span className="num">{v.toLocaleString('en-GB')}</span>;
    if ((kind === 'date' || kind === 'datetime') && typeof v === 'string') {
      return kind === 'datetime' && v.length > 10 ? <When date={v.slice(0, 10)} time={v.slice(11, 16)} short /> : <When date={v.slice(0, 10)} short />;
    }
    return typeof v === 'string' ? capital(v) : String(v);
  };
}

const WIDTH: Record<Kind, number> = { count: 120, pct: 120, money: 140, date: 150, datetime: 170, text: 150, bool: 110 };

const col = (id: string, header: string, kind: Kind): ColumnDef => ({
  id, header,
  build: () => ({
    headerName: header, width: WIDTH[kind],
    ...(kind === 'count' || kind === 'pct' || kind === 'money' ? { type: 'rightAligned', filter: 'agNumberColumnFilter' } : {}),
    valueGetter: (p) => p.data?.facts[id] ?? null,
    cellRenderer: cell(kind, id),
  }),
});

export const COLUMNS: ColumnDef[] = [
  // Stage 1 · Intake
  col('fieldsToCheck', 'Fields to check', 'count'),
  col('fieldsBlocking', 'Fields blocking DG1', 'count'),
  col('eligPass', 'Eligibility: pass', 'count'),
  col('eligAtRisk', 'Eligibility: at risk', 'count'),
  col('eligInterpretation', 'Eligibility: interpretation', 'count'),
  col('eligFail', 'Eligibility: fail', 'count'),
  col('documents', 'Documents', 'text'),
  col('documentFee', 'Document fee', 'money'),
  col('purchaseBy', 'Buy documents by', 'date'),
  col('language', 'Language', 'text'),
  col('dg1Due', 'DG1 due', 'datetime'),
  // Stage 2 · Sourcing
  col('packagesCovered', 'Packages covered', 'count'),
  col('packagesTotal', 'Packages', 'count'),
  col('rfqsSent', 'RFQs sent', 'count'),
  col('rfqsTotal', 'RFQs to send', 'count'),
  col('rfqsOverdue', 'Overdue RFQs', 'count'),
  col('rfqsEscalated', 'Escalated RFQs', 'count'),
  col('rfqsAnsweredOnTime', 'Replies on time', 'count'),
  col('rfqsDueSoFar', 'Replies due so far', 'count'),
  col('toLevel', 'To level', 'count'),
  col('notCoveredPct', 'Not covered (% of BOQ value)', 'pct'),
  col('repliesDue', 'Replies due', 'date'),
  col('clarificationsOpen', 'Open clarifications', 'count'),
  col('clarificationsStale', 'Stale clarifications', 'count'),
  col('bestFitApproved', 'Packages with best fit approved', 'count'),
  // Stage 3 · Bid decision
  col('pack', 'Pack', 'text'),
  col('packIssuedAt', 'Pack issued', 'datetime'),
  col('inputsRequested', 'Inputs requested', 'count'),
  col('inputsOutstanding', 'Inputs outstanding', 'count'),
  col('inputsLate', 'Late inputs', 'count'),
  col('positionsRecorded', 'Positions', 'count'),
  col('positionsOf', 'Committee seats', 'count'),
  col('quorum', 'Quorum', 'text'),
  col('winP', 'Win probability', 'pct'),
  col('winBand', 'Win band (± points)', 'count'),
  col('marginMin', 'Margin range: low', 'pct'),
  col('marginMax', 'Margin range: high', 'pct'),
  col('facilityAfter', 'Facility after bond', 'money'),
  col('weightedValue', 'Weighted value', 'money'),
  col('dg2SlaEnd', 'DG2 SLA ends', 'datetime'),
  // Stage 4 · Planning
  col('durationPlannedM', 'Duration planned (months)', 'count'),
  col('durationRequiredM', 'Duration required (months)', 'count'),
  col('floatDays', 'Float (days)', 'count'),
  col('longLeadAtRisk', 'Long-lead at risk', 'count'),
  col('peakManpower', 'Peak manpower', 'count'),
  col('baselineDue', 'Baseline due', 'date'),
  col('m2Due', 'M2 due', 'date'),
  col('clashWith', 'Resource clash with', 'text'),
  // Stage 5 · Pricing
  col('estPrice', 'Estimated price', 'money'),
  col('baseMarginPct', 'Base margin', 'pct'),
  col('minMarginPct', 'Minimum margin', 'pct'),
  col('sourcedPct', 'Sourced', 'pct'),
  col('estimatedPct', 'Estimated', 'pct'),
  col('financeCheck', 'Finance check', 'text'),
  col('priceDue', 'Price due', 'date'),
  // Stage 6 · Proposal
  col('sectionsLocked', 'Sections locked', 'count'),
  col('sectionsTotal', 'Sections', 'count'),
  col('sectionsLate', 'Late sections', 'count'),
  col('simScore', 'Simulated score', 'count'),
  col('passMark', 'Pass mark', 'count'),
  col('smeOverdue', 'SME tasks overdue', 'count'),
  col('redTeamAt', 'Red-team review', 'datetime'),
  col('reusePct', 'Content reused', 'pct'),
  // Stage 7 · Compliance
  col('evidenced', 'Requirements evidenced', 'count'),
  col('requirements', 'Requirements', 'count'),
  col('evidencedPct', 'Evidenced', 'pct'),
  col('mandatoryGaps', 'Mandatory gaps', 'count'),
  col('redlinesOpen', 'Redlines open', 'count'),
  col('risksWithoutOwner', 'Risks without owner', 'count'),
  col('dg3IssuedAt', 'DG3 pack issued', 'datetime'),
  col('dg3SlaEnd', 'DG3 SLA ends', 'datetime'),
  // Stage 8 · Submission
  col('packageReadyPct', 'Package ready', 'pct'),
  col('signaturesPending', 'Signatures pending', 'count'),
  col('bondAmount', 'Bid bond', 'money'),
  col('bondValidTo', 'Bid bond valid to', 'date'),
  col('bondRequiredTo', 'Bid bond required to', 'date'),
  col('bondIssued', 'Bid bond issued', 'bool'),
  col('openingDate', 'Opening', 'date'),
  col('expectedAwardBy', 'Result expected by', 'date'),
  // Stage 9 · Results
  col('handoverAt', 'Handover', 'datetime'),
  col('debriefAt', 'Debrief', 'datetime'),
  // Any submitted tender, and any result
  col('portal', 'Portal', 'text'),
  col('receipt', 'Receipt', 'text'),
  col('submittedAt', 'Submitted', 'datetime'),
  col('result', 'Result', 'text'),
  col('rankPlace', 'Our rank', 'count'),
  col('rankOf', 'Bidders', 'count'),
  col('gapToWinnerPct', 'Gap to winner', 'pct'),
  col('lossReason', 'Loss reason', 'text'),
  col('predictedWin', 'Predicted at DG2', 'pct'),
  col('lessons', 'Lessons captured', 'bool'),
];
