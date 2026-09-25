import type { BidOutcome, Dg1Record, Dg2History, TenantHistory } from '../types';
import { NOW, cmp } from './chain';
import { WINDOW_FROM } from './targets';
import type { Lifecycle } from './types';

/**
 * Plan 004's history arrays, derived from the lifecycles (plan 017 §3.4 (b)),
 * so a decision is stored once:
 * - `dg1`: DG1 decisions of the last 90 days;
 * - `dg2`: DG2 decisions of the last 12 months;
 * - `outcomes`: results won or lost in the last 12 months, with the tender id as the id.
 * Each list is in time order.
 */

const since = (iso: string, from: string) => iso >= from && iso <= NOW;

export function historyFrom(lcs: Lifecycle[]): TenantHistory {
  const dg1: Dg1Record[] = [];
  const dg2: Dg2History[] = [];
  const outcomes: BidOutcome[] = [];
  for (const l of lcs) {
    for (const g of l.gates) {
      if (g.gate === 'DG1' && since(g.at, WINDOW_FROM['90d'])) {
        dg1.push({
          tenderId: l.tenderId, title: l.title, decision: g.decision as Dg1Record['decision'], at: g.at, byId: g.byId,
          recommendation: g.recommendation ?? 'pursue', withinSla: g.onTime, reasonCodes: g.reasonCodes, ...(g.note ? { note: g.note } : {}),
        });
      }
      if (g.gate === 'DG2' && since(g.at, WINDOW_FROM['12m'])) {
        dg2.push({
          tenderId: l.tenderId, title: l.title, at: g.at, decision: g.decision as Dg2History['decision'], withinSla: g.onTime,
          againstMajority: !!g.againstMajority, ...(g.reopened ? { reopened: g.reopened } : {}),
        });
      }
    }
    const res = l.result;
    if (res && (res.result === 'won' || res.result === 'lost') && l.submission && since(res.at, WINDOW_FROM['12m'])) {
      outcomes.push({
        id: l.tenderId, title: l.title, sector: l.sector, clientType: l.clientType ?? 'government',
        value: res.value ?? { amount: l.value.amount, ccy: l.value.ccy },
        submitted: l.submission.at.slice(0, 10), decided: res.at.slice(0, 10), result: res.result,
        ...(res.lossReason ? { lossReason: res.lossReason } : {}), ...(res.predictedWin !== undefined ? { predictedWin: res.predictedWin } : {}),
      });
    }
  }
  const byAt = (a: { at: string }, b: { at: string }) => cmp(a.at, b.at);
  return { dg1: dg1.sort(byAt), dg2: dg2.sort(byAt), outcomes: outcomes.sort((a, b) => cmp(a.decided, b.decided)) };
}
