import type { BidOutcome, Criterion, Money } from '@/data/gcc/types';
import { CRITERIA } from '@/data/gcc/types';
import { s1Data } from '@/data/gcc/s1';
import { DEMO_TODAY } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import type { Done } from './done';
import { bidBondFor } from './bond';
import { failKindsText, fitScoresFor, type EligibilityLine, type EligibilityResult } from './eligibility';
import { blockingOpen } from './validation';
import { asCommitment, peakMonth, type PeakMonth } from './triage';
import { dataOf, dayMonth, keyDate, listText, profileOf, tenantCcy, tenderOf, weightedOf } from './common';

/**
 * The fit score and the agent's recommendation (spec §6.6, §5.1; plan 007a
 * Phase 3). The weighted score uses the tenant's own weights and thresholds;
 * a PQ fail caps the verdict whatever the score, and a team over capacity
 * turns Pursue into Pursue with conditions. The agent recommends; people
 * decide, so the verdict never reads "Discard" on its own.
 */

export const CRITERION_LABEL: Record<Criterion, string> = {
  scope: 'Scope and sector fit', size: 'Size against band and limit', eligibility: 'Eligibility result', geography: 'Geography and presence',
  client: 'Client relationship and payment record', terms: 'Contract terms and risk', team: 'Team capacity', facility: 'Bond facility headroom',
  strategy: 'Strategic priority',
};

export type Verdict = 'pursue' | 'conditions' | 'discard';

export const VERDICT_LABEL = {
  pursue: 'Pursue',
  conditions: 'Pursue with conditions',
  conditionsJv: 'Pursue with conditions (JV needed)',
  discard: 'Recommend discard',
} as const;

export interface FitRow {
  criterion: Criterion;
  label: string;
  weight: number;
  score: number;
  /** The seed's input, when the live score differs (eligibility after a renewal). */
  storedScore?: number;
  reason: string;
  source: string;
  /** weight × score ÷ 10: the row's points out of the weighted 100. */
  contribution: number;
}

export interface ComparableVM { id: string; title: string; value: Money; result: BidOutcome['result']; lossReason?: BidOutcome['lossReason']; decided: string }

export interface FitResult {
  tenderId: string;
  weighted: number;
  rows: FitRow[];
  /** The verdict the weighted score alone gives. */
  byScore: Verdict;
  verdict: Verdict;
  verdictLabel: string;
  /** The rule that changed the verdict, if any. */
  capped: null | 'pq-fail' | 'pq-fail-jv' | 'capacity';
  confidence: 'high' | 'medium' | 'low';
  confidenceWhy: string;
  strengths: string[];
  concerns: string[];
  wouldChange: string[];
  comparables: ComparableVM[];
  eligibility: EligibilityResult | null;
  /** The effort team's busiest month to submission, with this tender added. */
  capacity: (PeakMonth & { teamId: string; teamName: string }) | null;
  thresholds: { pursueAt: number; conditionsFrom: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const family = (s: string) => s.toLowerCase().split(/[\s,]+/)[0];

/** Up to three past bids in the same sector, closest in value. */
function comparablesFor(tenant: string, sector: string, value: Money): ComparableVM[] {
  const ccy = tenantCcy(tenant);
  const v = convert(value.amount, value.ccy, ccy);
  return dataOf(tenant).history.outcomes
    .filter((o) => family(o.sector) === family(sector))
    .map((o) => ({ o, gap: Math.abs(convert(o.value.amount, o.value.ccy, ccy) - v) }))
    .sort((a, b) => a.gap - b.gap || b.o.decided.localeCompare(a.o.decided))
    .slice(0, 3)
    .map(({ o }) => ({
      id: o.id, title: o.title, value: { amount: convert(o.value.amount, o.value.ccy, ccy), ccy }, result: o.result,
      ...(o.lossReason ? { lossReason: o.lossReason } : {}), decided: o.decided,
    }));
}

const certRenewals = (lines: EligibilityLine[]) => lines.filter((l) => l.state === 'at-risk' && l.renew?.length);

export function fitFor(tenant: string, tenderId: string, done: Done): FitResult | null {
  const t = tenderOf(tenant, tenderId);
  const live = fitScoresFor(tenant, tenderId, done);
  if (!t || !live) return null;
  const d = dataOf(tenant);
  const { scores, eligibility } = live;
  const { pursueAt, conditionsFrom } = d.fit;

  const rows: FitRow[] = CRITERIA.map((c) => {
    const stored = t.fit[c].score;
    const changed = scores[c] !== stored;
    return {
      criterion: c, label: CRITERION_LABEL[c], weight: d.fit.weights[c], score: scores[c], ...(changed ? { storedScore: stored } : {}),
      reason: c === 'eligibility' && changed && eligibility ? `Re-checked: ${eligibility.text}` : t.fit[c].reason,
      source: t.fit[c].source, contribution: round1((d.fit.weights[c] * scores[c]) / 10),
    };
  });
  const weighted = weightedOf(d, scores);
  const byScore: Verdict = weighted >= pursueAt ? 'pursue' : weighted >= conditionsFrom ? 'conditions' : 'discard';

  // Capacity: the effort team's busiest calendar month from today to submission.
  const effort = s1Data(tenant).effort.find((e) => e.tenderId === tenderId);
  const team = effort ? d.teams.find((x) => x.id === effort.teamId) : undefined;
  const sub = keyDate(t, 'submission');
  const capacity = effort && team && sub && sub.date >= DEMO_TODAY
    ? { ...peakMonth(team, DEMO_TODAY, sub.date, [asCommitment(effort)]), teamId: team.id, teamName: team.name }
    : null;

  let verdict = byScore;
  let capped: FitResult['capped'] = null;
  const jv = eligibility?.verdict === 'eligible-with-jv';
  if (eligibility?.verdict === 'not-eligible' && verdict !== 'discard') { verdict = 'discard'; capped = 'pq-fail'; }
  else if (jv && verdict === 'pursue') { verdict = 'conditions'; capped = 'pq-fail-jv'; }
  if (verdict === 'pursue' && capacity && capacity.share > 1) { verdict = 'conditions'; capped = 'capacity'; }
  const verdictLabel = verdict === 'pursue' ? VERDICT_LABEL.pursue
    : verdict === 'discard' ? VERDICT_LABEL.discard
    : jv ? VERDICT_LABEL.conditionsJv : VERDICT_LABEL.conditions;

  const blocking = blockingOpen(tenant, tenderId, done);
  const [confidence, confidenceWhy]: [FitResult['confidence'], string] =
    !t.requirements?.length ? ['low', 'No requirements extracted yet']
    : t.value.basis === 'not-stated' ? ['low', 'Value not stated in the document']
    : blocking.count ? ['medium', `${blocking.count} field${blocking.count === 1 ? '' : 's'} still being validated`]
    : ['high', 'Key fields validated'];

  const strengths = rows.filter((r) => r.score >= 8).sort((a, b) => b.contribution - a.contribution).slice(0, 3).map((r) => r.reason);
  const risky = eligibility?.lines.filter((l) => l.state === 'fail' || l.state === 'at-risk') ?? [];
  const concerns = [
    ...rows.filter((r) => r.score <= 6).sort((a, b) => a.contribution - b.contribution).slice(0, 3).map((r) => r.reason),
    ...risky.map((l) => `${l.reqId}: ${l.why}`),
  ];

  // What would change it (step 3.1.7), in a fixed order.
  const wouldChange: string[] = [];
  if (eligibility?.verdict === 'not-eligible') {
    // The tenant's lead sector decides the route: an MEP contractor can join a Grade 1 bidder as its MEP subcontractor.
    const mep = /\bMEP\b/.test(profileOf(tenant).sectors[0] ?? '');
    wouldChange.push(mep
      ? 'Join a Grade 1 bidder as MEP subcontractor (inside the 30% subcontracting cap)'
      : `A JV partner covering ${failKindsText(eligibility.lines, t.requirements?.find((r) => r.country)?.country)}`);
  } else if (jv && eligibility?.jvPartner && eligibility.jv) {
    wouldChange.push(`A JV with ${eligibility.jvPartner.name} as lead (${eligibility.jv.shares[0]}/${eligibility.jv.shares[1]}) clears the ${eligibility.counts.fail} failing lines`);
  }
  if (capacity && capacity.share > 1) wouldChange.push(`${capacity.teamName} peaks at ${capacity.pct}% in ${capacity.month}: release a bid or add estimators`);
  const bond = bidBondFor(tenant, tenderId, done);
  if (bond?.facilityTight && bond.rate !== null) {
    const onAward = [bond.performanceIfWon && `a ${money(bond.performanceIfWon.amount, bond.performanceIfWon.ccy, { dp: 2 })} performance bond`,
      bond.advanceIfWon && `a ${money(bond.advanceIfWon.amount, bond.advanceIfWon.ccy, { dp: 2 })} advance payment guarantee`].filter(Boolean) as string[];
    wouldChange.push(`Finance to confirm the facility; headroom ${money(bond.headroom.amount, bond.headroom.ccy)} against the ${money(bond.amount.amount, bond.amount.ccy)} bid bond, then ${listText(onAward)} if won`);
  }
  if (blocking.count) wouldChange.push(`Resolve ${blocking.count} field${blocking.count === 1 ? '' : 's'} in the intake queue`);
  const renew = certRenewals(eligibility?.lines ?? []);
  if (renew.length) {
    const labels = renew.flatMap((l) => l.renew!.map((r) => r.label));
    wouldChange.push(`Renew the ${listText(labels)} before ${dayMonth(renew.map((l) => l.checkedAgainst.date).sort()[0])}`);
  }
  for (const l of eligibility?.lines.filter((x) => x.state === 'interpretation') ?? []) {
    const drafted = s1Data(tenant).queries.some((q) => q.tenderId === tenderId && q.relatesTo === l.reqId);
    wouldChange.push(`Confirm the reading of ${l.reqId} with the employer${drafted ? ' (query drafted)' : ''}`);
  }

  return {
    tenderId, weighted, rows, byScore, verdict, verdictLabel, capped, confidence, confidenceWhy, strengths, concerns, wouldChange,
    comparables: comparablesFor(tenant, t.sector, t.value), eligibility, capacity, thresholds: { pursueAt, conditionsFrom },
  };
}

// ---------------------------------------------------------------------------
// The recommendation card (spec §5.1, step 3.2)

export interface SourceRef { label: string; kind: 'page' | 'credential' | 'project' | 'calc'; page?: number; id?: string }

export interface RecommendationVM {
  agent: 'Intake & Extraction';
  tenderId: string;
  recommendation: string;
  verdict: Verdict;
  confidence: FitResult['confidence'];
  confidenceWhy: string;
  reasons: string[];
  wouldChange: string[];
  sources: SourceRef[];
  disclaimer: 'Recommendation, not a decision.';
}

export function recommendationFor(tenant: string, tenderId: string, done: Done): RecommendationVM | null {
  const fit = fitFor(tenant, tenderId, done);
  if (!fit) return null;
  const lines = fit.eligibility?.lines ?? [];
  const fails = lines.filter((l) => l.state === 'fail');
  const reasons = fit.verdict === 'pursue' ? fit.strengths
    : fit.verdict === 'discard' ? (fails.length ? fails.map((l) => `${l.reqId}: ${l.why}`) : fit.concerns)
    : [fit.capped === 'capacity' ? fit.wouldChange.find((w) => w.includes('peaks at')) ?? fit.concerns[0]
      : fit.capped === 'pq-fail-jv' && fit.eligibility ? `Eligibility: ${fit.eligibility.text}` : fit.concerns[0], ...fit.strengths].filter(Boolean);

  const sources: SourceRef[] = [];
  const add = (s: SourceRef) => { if (!sources.some((x) => x.label === s.label)) sources.push(s); };
  for (const l of lines.filter((x) => x.state !== 'pass' && x.state !== 'na')) {
    add({ label: `p. ${l.page}`, kind: 'page', page: l.page });
    for (const e of l.evidence.filter((x) => x.kind === 'credential' && l.state === 'at-risk')) add({ label: `Credential: ${e.label}`, kind: 'credential', id: e.id });
  }
  add({ label: 'Calc: fit model', kind: 'calc' });

  return {
    agent: 'Intake & Extraction', tenderId, recommendation: fit.verdictLabel, verdict: fit.verdict,
    confidence: fit.confidence, confidenceWhy: fit.confidenceWhy, reasons: reasons.slice(0, 3), wouldChange: fit.wouldChange,
    sources: sources.slice(0, 6), disclaimer: 'Recommendation, not a decision.',
  };
}
