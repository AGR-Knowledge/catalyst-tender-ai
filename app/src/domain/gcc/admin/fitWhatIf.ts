import { CRITERIA, type Criterion, type FitModel, type TenantData } from '@/data/gcc/types';
import { isGccTenantKey } from '@/data/gcc';
import type { Person } from '@/data/people';
import { currentOf, liveOf, type DemoDone } from '@/domain/gcc/lifecycle';
import { fitScoresFor } from '@/domain/gcc/s1/eligibility';
import { CRITERION_LABEL, VERDICT_LABEL, fitFor, type FitResult, type Verdict } from '@/domain/gcc/s1/fit';
import { dataOf, weightedOf } from '@/domain/gcc/s1/common';

/**
 * Administration › Fit model & rules (plan 024 Phase 3): the what-if. The
 * presenter moves the weights and the two thresholds and sees, for every live
 * Stage 1 tender, the score and recommendation now and with the what-if.
 * Nothing is saved (like the JV scenario on the Eligibility panel): five
 * modules read the fit model, and every screen keeps the current one.
 *
 * The scores come from `fitScoresFor` (eligibility re-checked, as Screening
 * does), the arithmetic from `weightedOf`, and the verdict from the same caps
 * `fitFor` applies (a PQ fail, a JV-dependent pass, a team over capacity), so
 * with the current model every row equals `fitFor`.
 */

export type WhatIfModel = Pick<FitModel, 'weights' | 'pursueAt' | 'conditionsFrom'>;

/** The sliders' ranges: a weight in percent, a threshold on the 0–100 fit score. */
export const WEIGHT_MAX = 50;
export const SCORE_MAX = 100;

/** Why a verdict was capped, in words (the rules `fitFor` applies). */
export const CAP_TEXT: Record<NonNullable<FitResult['capped']>, string> = {
  'pq-fail': 'Capped: a PQ requirement fails',
  'pq-fail-jv': 'Capped: passes only with a JV partner',
  capacity: 'Capped: the bid team is over capacity',
};

/** The three caps, stated as rules. */
export const CAP_RULES = [
  'A PQ fail caps the recommendation at Recommend discard, whatever the score.',
  'A pass that needs a JV partner caps it at Pursue with conditions.',
  'A bid team over capacity turns Pursue into Pursue with conditions.',
];

export interface WhatIfSide {
  weighted: number;
  verdict: Verdict;
  label: string;
  capped: FitResult['capped'];
}

export interface WhatIfRow {
  /** The tender id, as the grid's row id. */
  id: string;
  tenderId: string;
  shortTitle: string;
  restricted: boolean;
  now: WhatIfSide;
  next: WhatIfSide;
  /** The recommendation changes. */
  changed: boolean;
}

export interface WhatIfVM {
  /** Changed rows first, then the highest score now. */
  rows: WhatIfRow[];
  changed: number;
  /** "2 move from Pursue to Pursue with conditions". */
  moves: { from: string; to: string; n: number }[];
  /** Live Stage 1 tenders the viewer may not open, scored but not listed. */
  hidden: number;
}

/** The per-tender inputs the what-if re-weighs: worked out once per tenant and demo state. */
export interface WhatIfBase {
  d: TenantData;
  items: { tenderId: string; shortTitle: string; restricted: boolean; scores: Record<Criterion, number>; fit: FitResult }[];
  hidden: number;
}

export const modelOf = (d: TenantData): WhatIfModel => ({ weights: { ...d.fit.weights }, pursueAt: d.fit.pursueAt, conditionsFrom: d.fit.conditionsFrom });

export const weightsTotal = (w: Record<Criterion, number>) => CRITERIA.reduce((s, c) => s + w[c], 0);

/** Weights are percentages of the whole score. */
export const WEIGHTS_TOTAL = 100;

/** The "Weights must add up to 100%" check, in words. */
export function weightsCheck(w: Record<Criterion, number>): { ok: boolean; text: string } {
  const total = weightsTotal(w);
  return total === WEIGHTS_TOTAL
    ? { ok: true, text: `Weights add up to ${total}%` }
    : { ok: false, text: `Weights add up to ${total}%. They must add up to ${WEIGHTS_TOTAL}%` };
}

export const THRESHOLD_ORDER_TEXT = '“Pursue with conditions” must start below “Pursue”';

/** Why the what-if can't be scored yet, in words; empty when it can. */
export function whatIfProblems(m: WhatIfModel): string[] {
  const out: string[] = [];
  const w = weightsCheck(m.weights);
  if (!w.ok) out.push(`${w.text}.`);
  if (m.conditionsFrom >= m.pursueAt) out.push(`${THRESHOLD_ORDER_TEXT}.`);
  return out;
}

/**
 * Keeps one criterion's weight and spreads the rest of 100 over the others in
 * their current proportions, in whole points (largest remainder).
 */
export function balanceWeights(w: Record<Criterion, number>, keep: Criterion): Record<Criterion, number> {
  const kept = Math.max(0, Math.min(WEIGHTS_TOTAL, Math.round(w[keep])));
  const others = CRITERIA.filter((c) => c !== keep);
  const rest = WEIGHTS_TOTAL - kept;
  const sum = others.reduce((s, c) => s + w[c], 0);
  const raw = others.map((c) => (sum > 0 ? (w[c] * rest) / sum : rest / others.length));
  const whole = raw.map(Math.floor);
  let left = rest - whole.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - whole[i] })).sort((a, b) => b.f - a.f || a.i - b.i).forEach(({ i }) => {
    if (left > 0) { whole[i]++; left--; }
  });
  return { ...(Object.fromEntries(others.map((c, i) => [c, whole[i]])) as Record<Criterion, number>), [keep]: kept };
}

/** The verdict a score gives, capped exactly as `fitFor` caps it. */
function sideOf(weighted: number, m: WhatIfModel, fit: FitResult): WhatIfSide {
  let verdict: Verdict = weighted >= m.pursueAt ? 'pursue' : weighted >= m.conditionsFrom ? 'conditions' : 'discard';
  let capped: FitResult['capped'] = null;
  const jv = fit.eligibility?.verdict === 'eligible-with-jv';
  if (fit.eligibility?.verdict === 'not-eligible' && verdict !== 'discard') { verdict = 'discard'; capped = 'pq-fail'; }
  else if (jv && verdict === 'pursue') { verdict = 'conditions'; capped = 'pq-fail-jv'; }
  if (verdict === 'pursue' && fit.capacity && fit.capacity.share > 1) { verdict = 'conditions'; capped = 'capacity'; }
  const label = verdict === 'pursue' ? VERDICT_LABEL.pursue
    : verdict === 'discard' ? VERDICT_LABEL.discard
    : jv ? VERDICT_LABEL.conditionsJv : VERDICT_LABEL.conditions;
  return { weighted, verdict, label, capped };
}

/** The live Stage 1 tenders and their fit inputs. Restricted tenders the viewer can't open are counted, not listed. */
export function whatIfBase(tenant: string, done: DemoDone, viewer?: Person): WhatIfBase | null {
  if (!isGccTenantKey(tenant)) return null;
  const d = dataOf(tenant);
  const inS1 = (list: ReturnType<typeof liveOf>) => list.filter((l) => currentOf(l).stage === 1);
  const all = inS1(liveOf(tenant, undefined, done));
  const shown = viewer ? new Set(inS1(liveOf(tenant, viewer, done)).map((l) => l.tenderId)) : null;
  const items = all.flatMap((l) => {
    if (shown && !shown.has(l.tenderId)) return [];
    const live = fitScoresFor(tenant, l.tenderId, done as Record<string, string>);
    const fit = fitFor(tenant, l.tenderId, done as Record<string, string>);
    return live && fit ? [{ tenderId: l.tenderId, shortTitle: l.shortTitle, restricted: !!l.restricted, scores: live.scores, fit }] : [];
  });
  return { d, items, hidden: shown ? all.length - shown.size : 0 };
}

/** Re-weighs the base with the what-if. Cheap: no rule is re-run. */
export function applyWhatIf(base: WhatIfBase, m: WhatIfModel): WhatIfVM {
  const weighed: TenantData = { ...base.d, fit: { ...base.d.fit, weights: m.weights } };
  const rows = base.items.map((it) => {
    const now: WhatIfSide = { weighted: it.fit.weighted, verdict: it.fit.verdict, label: it.fit.verdictLabel, capped: it.fit.capped };
    const next = sideOf(weightedOf(weighed, it.scores), m, it.fit);
    return { id: it.tenderId, tenderId: it.tenderId, shortTitle: it.shortTitle, restricted: it.restricted, now, next, changed: next.label !== now.label };
  }).sort((a, b) => Number(b.changed) - Number(a.changed) || b.now.weighted - a.now.weighted || a.tenderId.localeCompare(b.tenderId));

  const moves = new Map<string, { from: string; to: string; n: number }>();
  rows.filter((r) => r.changed).forEach((r) => {
    const k = `${r.now.label}→${r.next.label}`;
    const x = moves.get(k) ?? { from: r.now.label, to: r.next.label, n: 0 };
    x.n++;
    moves.set(k, x);
  });
  return { rows, changed: rows.filter((r) => r.changed).length, moves: [...moves.values()], hidden: base.hidden };
}

/** One call: the plan's `fitWhatIf(tenant, done, model)`. */
export function fitWhatIf(tenant: string, done: DemoDone, m: WhatIfModel, viewer?: Person): WhatIfVM | null {
  const base = whatIfBase(tenant, done, viewer);
  return base ? applyWhatIf(base, m) : null;
}

/** "Raising Team capacity to 20% moves 1 live tender from Pursue to Pursue with conditions." */
export function movesText(vm: WhatIfVM): string {
  if (!vm.changed) return 'No live tender changes its recommendation.';
  const parts = vm.moves.map((x) => `${x.n} from ${x.from} to ${x.to}`);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${vm.changed} live ${vm.changed === 1 ? 'tender moves' : 'tenders move'}: ${list}.`;
}

export { CRITERION_LABEL };
