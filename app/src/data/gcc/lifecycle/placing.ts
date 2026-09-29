import type { GccTenantKey } from '../index';
import type { Draft } from './fold';
import { POOLS } from './pools';
import { rngOf } from './rng';
import type { Lifecycle, Result } from './types';

/**
 * Our place and the gap to the winner on a lost bid (plan 034 §1), for the
 * losses the records don't state. Each tender draws from its own stream,
 * seeded by its id, so the generator's stream never moves.
 *
 * - Bidders: 3–9, more on larger tenders (the value against its sector range).
 * - Price: 2nd to 4th, 0.8–12% above the winner, most under 7%.
 * - Local content: 2nd, 0.5–3% (lost on the weighting, not by much on price).
 * - Technical: the technical ranking, 2nd to last; no gap.
 * - Prequalification: not opened, so neither.
 * - Other: a place from 2nd, and a gap of 1–10%.
 *
 * Whether the employer published them: government and semi-government
 * clients on 80% of price and local-content losses, private clients on 30%,
 * technical rankings on half, other losses a place on half and a gap on a
 * third. The shares are exact within each company (`placeLosses`), and each
 * tender's own draw decides which of its group are published, so a small
 * company never reads "not published" by chance.
 */

export interface PlacingInput {
  tenant: GccTenantKey;
  tenderId: string;
  lossReason?: Result['lossReason'];
  sector: string;
  /** The tender's value, major units of the tenant currency. */
  amount: number;
}

export type Placing = Pick<Result, 'rank' | 'gapToWinnerPct'>;

/** The figures the employer would publish for one loss, and its draw for whether it did (lowest first). */
export interface PlacingDraw { order: number; placing: Placing }

export function placingFor({ tenant, tenderId, lossReason, sector, amount }: PlacingInput): PlacingDraw {
  const r = rngOf(`place:${tenant}:${tenderId}`);
  const order = r.next();
  if (lossReason === 'pq') return { order, placing: {} };
  const [lo, hi] = POOLS[tenant].sectors[sector]?.value ?? [0, 0];
  const size = hi > lo ? Math.min(1, Math.max(0, (amount - lo) / (hi - lo))) : 0.5;
  const bidders = Math.min(9, 3 + Math.round(size * 4) + r.int(0, 2));
  const pct = (from: number, to: number) => Math.round(r.range(from, to) * 10) / 10;
  if (lossReason === 'price') {
    const place = r.weighted(([[2, 3], [3, 2], [4, 1]] as const).filter(([p]) => p <= bidders));
    return { order, placing: { rank: [place, bidders], gapToWinnerPct: place === 2 ? pct(0.8, 5) : place === 3 ? pct(2, 8) : pct(4, 12) } };
  }
  if (lossReason === 'local-content') return { order, placing: { rank: [2, bidders], gapToWinnerPct: pct(0.5, 3) } };
  if (lossReason === 'technical') return { order, placing: { rank: [r.int(2, bidders), bidders] } };
  return { order, placing: { rank: [r.int(2, bidders), bidders], gapToWinnerPct: pct(1, 10) } };
}

/** The group a loss is published in, and the share of its group that is: [place, gap]. */
function shareOf(reason: Result['lossReason'], clientType: Lifecycle['clientType']): [string, number, number] {
  const open = clientType === 'private' ? 0.3 : 0.8;
  if (reason === 'pq') return ['pq', 0, 0];
  if (reason === 'price' || reason === 'local-content') return [`${reason}:${clientType === 'private' ? 'private' : 'public'}`, open, open];
  if (reason === 'technical') return ['technical', 0.5, 0];
  return ['other', 0.5, 1 / 3];
}

/**
 * Adds the published place and gap to a company's lost results that state
 * neither (folded and generated alike). Needs the drafts' tender ids.
 */
export function placeLosses(drafts: Draft[]): void {
  const groups = new Map<string, { d: Draft; draw: PlacingDraw; place: number; gap: number }[]>();
  for (const d of drafts) {
    const res = d.result;
    if (!res || res.result !== 'lost' || res.rank || res.gapToWinnerPct !== undefined) continue;
    if (!d.id) throw new Error(`Placing ${d.tenant}: ${d.from} has no tender id yet`);
    const draw = placingFor({ tenant: d.tenant as GccTenantKey, tenderId: d.id, lossReason: res.lossReason, sector: d.sector, amount: d.value.amount });
    const [key, place, gap] = shareOf(res.lossReason, d.clientType);
    groups.set(key, [...(groups.get(key) ?? []), { d, draw, place, gap }]);
  }
  for (const xs of groups.values()) {
    xs.sort((a, b) => a.draw.order - b.draw.order);
    const places = Math.round(xs[0].place * xs.length);
    const gaps = Math.round(xs[0].gap * xs.length);
    xs.forEach(({ d, draw }, i) => {
      if (i >= places) return;
      const { rank, gapToWinnerPct } = draw.placing;
      d.result = { ...d.result!, ...(rank ? { rank } : {}), ...(i < gaps && gapToWinnerPct !== undefined ? { gapToWinnerPct } : {}) };
    });
  }
}
