import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ChevronRight } from 'lucide-react';
import { fitFor, type FitResult, type FitRow } from '@/domain/gcc/s1';
import { money } from '@/domain/money';
import { dayMonthYear } from '@/domain/gcc/s1/common';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { StatusPill } from '@/components/tender/StatusPill';
import type { S1 } from '../vm/useS1';
import { S1Grid } from './Grid';

/**
 * The fit score (spec §6.6): the weighted score against the tenant's own
 * weights and thresholds, the verdict and the rule that capped it, the
 * confidence, strengths, concerns, what would sharpen it and comparable past
 * bids. Collapsed by default, as the DG1 pack shows it.
 */

const CAPPED: Record<NonNullable<FitResult['capped']>, string> = {
  'pq-fail': 'A PQ fail caps the verdict at Recommend discard, whatever the weighted score.',
  'pq-fail-jv': 'Bidding alone fails the PQ: the verdict is capped at Pursue with conditions (JV needed).',
  capacity: 'The bid team would be over capacity: Pursue becomes Pursue with conditions.',
};
const BY_SCORE: Record<FitResult['byScore'], string> = { pursue: 'Pursue', conditions: 'Pursue with conditions', discard: 'Recommend discard' };
const RESULT: Record<string, string> = { won: 'Won', lost: 'Lost', withdrawn: 'Withdrawn' };

type Row = FitRow & { id: string };

export function FitBreakdown({ s1, tenderId, open: initial = false }: { s1: S1; tenderId: string; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const fit = useMemo(() => fitFor(s1.tenant, tenderId, s1.done), [s1.tenant, tenderId, s1.done]);
  if (!fit) return null;
  const tone = fit.verdict === 'pursue' ? 'green' : fit.verdict === 'conditions' ? 'orange' : 'red';
  const rows: Row[] = fit.rows.map((r) => ({ ...r, id: r.criterion }));
  const cols: ColDef<Row>[] = [
    { field: 'label', headerName: 'Criterion', flex: 1, minWidth: 180 },
    { field: 'weight', headerName: 'Weight', width: 84, cellClass: 's1-cell num' },
    {
      field: 'score', headerName: 'Score', width: 96,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && <span className="num">{p.data.score} / 10{p.data.storedScore !== undefined ? <span className="s1-sub-i"> (was {p.data.storedScore})</span> : ''}</span>,
    },
    { field: 'contribution', headerName: 'Points', width: 84, cellClass: 's1-cell num' },
    {
      field: 'reason', headerName: 'Why', flex: 2, minWidth: 260, sortable: false,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && <span className="s1-two"><span className="fit-why" title={p.data.reason}>{p.data.reason}</span><span className="s1-sub">{p.data.source}</span></span>,
    },
  ];

  return (
    <section className={`fitb ${open ? 'open' : ''}`} aria-label="Fit score">
      <button type="button" className="fitb-sum" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={14} className="fitb-chev" aria-hidden />
        <span className="fitb-t">Fit</span>
        <ThresholdBar value={fit.weighted} threshold={fit.thresholds.pursueAt} thresholdLabel="pursue at" tone={tone} label="Fit" />
        <span className="fitb-v">Verdict: {fit.verdictLabel}</span>
        <span className="fitb-c">{fit.confidence[0].toUpperCase() + fit.confidence.slice(1)} confidence</span>
      </button>
      {open && (
        <div className="fitb-body">
          <p className="fitb-line">
            Weighted {fit.weighted} of 100 on the company's own weights: pursue at {fit.thresholds.pursueAt}, pursue with conditions from {fit.thresholds.conditionsFrom}.
            {fit.capped && <> The score alone reads {BY_SCORE[fit.byScore]}. {CAPPED[fit.capped]}</>}
            {' '}Confidence is {fit.confidence}: {fit.confidenceWhy.toLowerCase()}.
          </p>
          <S1Grid rows={rows} columns={cols} label="Fit criteria" rowHeight={52} />
          <div className="fitb-lists">
            {fit.strengths.length > 0 && <div><h4>Strengths</h4><ul>{fit.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {fit.concerns.length > 0 && <div><h4>Concerns</h4><ul>{fit.concerns.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {fit.wouldChange.length > 0 && <div><h4>What would sharpen it</h4><ul>{fit.wouldChange.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          </div>
          {fit.comparables.length > 0 && <Comparables items={fit.comparables} />}
        </div>
      )}
    </section>
  );
}

/** Comparable past bids from the company's own history (spec §6.6, §7 item 7). */
export function Comparables({ items, heading = true }: { items: FitResult['comparables']; heading?: boolean }) {
  return (
    <div className="cmp">
      {heading && <h4>Comparable past bids</h4>}
      <ul>
        {items.map((c) => (
          <li key={c.id}>
            <span className="cmp-t">{c.title}</span>
            <span className="num cmp-v">{money(c.value.amount, c.value.ccy)}</span>
            <StatusPill label={`${RESULT[c.result] ?? c.result}${c.lossReason ? `: ${c.lossReason === 'pq' ? 'PQ' : c.lossReason.replace('-', ' ')}` : ''}`} tone={c.result === 'won' ? 'green' : 'grey'} icon={c.result === 'won' ? '✓' : '–'} />
            <span className="cmp-d">{dayMonthYear(c.decided)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
