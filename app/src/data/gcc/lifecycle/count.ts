import type { GateRecord, Lifecycle } from './types';

/**
 * Flow counts over a span of time, the way the dashboards count them
 * (dashboards.md §12.3): gate decisions by their time, submissions by
 * theirs, results (won and lost only) by theirs. `from` and `to` are
 * inclusive tenant-local date-times. The generator steers by these; the
 * dev check recounts with `domain/gcc/lifecycle.ts` and period.ts.
 */

export interface FlowCounts {
  dg1: { pursue: number; discard: number; hold: number; late: number };
  dg2: { bid: number; 'no-bid': number; late: number };
  dg3: { approved: number; rejected: number; late: number };
  submitted: number;
  /** Sum of the submitted bids' values, major units. */
  submittedValue: number;
  won: number;
  lost: number;
}

export const emptyFlows = (): FlowCounts => ({
  dg1: { pursue: 0, discard: 0, hold: 0, late: 0 },
  dg2: { bid: 0, 'no-bid': 0, late: 0 },
  dg3: { approved: 0, rejected: 0, late: 0 },
  submitted: 0, submittedValue: 0, won: 0, lost: 0,
});

const inSpan = (iso: string | undefined, from: string, to: string) => !!iso && iso >= from && iso <= to;

/** What the counts read: a lifecycle, or a generator draft before its stage log is built. */
export interface Countable extends Pick<Lifecycle, 'submission' | 'result' | 'value'> {
  gates: Pick<GateRecord, 'gate' | 'decision' | 'at' | 'onTime'>[];
}

export function addFlows(c: FlowCounts, l: Countable, from: string, to: string): FlowCounts {
  for (const g of l.gates) {
    if (!inSpan(g.at, from, to)) continue;
    if (g.gate === 'DG1') {
      c.dg1[g.decision as 'pursue' | 'discard' | 'hold']++;
      if (!g.onTime) c.dg1.late++;
    } else if (g.gate === 'DG2') {
      c.dg2[g.decision as 'bid' | 'no-bid']++;
      if (!g.onTime) c.dg2.late++;
    } else {
      c.dg3[g.decision as 'approved' | 'rejected']++;
      if (!g.onTime) c.dg3.late++;
    }
  }
  if (l.submission && inSpan(l.submission.at, from, to)) {
    c.submitted++;
    c.submittedValue += l.value.amount;
  }
  if (l.result && inSpan(l.result.at, from, to)) {
    if (l.result.result === 'won') c.won++;
    if (l.result.result === 'lost') c.lost++;
  }
  return c;
}

export function countFlows(lcs: Countable[], from: string, to: string): FlowCounts {
  const c = emptyFlows();
  for (const l of lcs) addFlows(c, l, from, to);
  return c;
}

/** a − b, flow by flow. */
export function subFlows(a: FlowCounts, b: FlowCounts): FlowCounts {
  return {
    dg1: { pursue: a.dg1.pursue - b.dg1.pursue, discard: a.dg1.discard - b.dg1.discard, hold: a.dg1.hold - b.dg1.hold, late: a.dg1.late - b.dg1.late },
    dg2: { bid: a.dg2.bid - b.dg2.bid, 'no-bid': a.dg2['no-bid'] - b.dg2['no-bid'], late: a.dg2.late - b.dg2.late },
    dg3: { approved: a.dg3.approved - b.dg3.approved, rejected: a.dg3.rejected - b.dg3.rejected, late: a.dg3.late - b.dg3.late },
    submitted: a.submitted - b.submitted, submittedValue: a.submittedValue - b.submittedValue, won: a.won - b.won, lost: a.lost - b.lost,
  };
}

/** Every flow as `[name, value]`, for messages and checks. */
export function flowEntries(c: FlowCounts): [string, number][] {
  return [
    ['DG1 pursue', c.dg1.pursue], ['DG1 discard', c.dg1.discard], ['DG1 hold', c.dg1.hold], ['DG1 late', c.dg1.late],
    ['DG2 bid', c.dg2.bid], ['DG2 no-bid', c.dg2['no-bid']], ['DG2 late', c.dg2.late],
    ['DG3 approved', c.dg3.approved], ['DG3 rejected', c.dg3.rejected], ['DG3 late', c.dg3.late],
    ['submitted', c.submitted], ['won', c.won], ['lost', c.lost],
  ];
}
