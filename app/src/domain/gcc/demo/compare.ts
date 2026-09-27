import type { Tone } from '@/data/types';
import { GCC_DATA, type GccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { personById } from '@/data/people';
import { money } from '@/domain/money';
import { dateText } from '@/domain/calendar';
import { dg1PackFor, dg1RecordFor, reasonLabel } from '@/domain/gcc/dg1';
import type { EligibilityLine, LineState } from '@/domain/gcc/s1/eligibility';

/**
 * The Compare tenants lens (plan 014 Phase 5, spec §11, script D): the hero
 * tender read in each of the five companies with **that company's** demo
 * state, side by side. A presenter view only: in the product nobody sees
 * across tenants. Every value comes from the Stage 1 and DG1 readers the
 * tenant's own screens use (the DG1 pack), in the tenant's currency.
 */

export interface CompareLine { reqId: string; state: LineState; why: string }

export interface CompareColumn {
  tenant: GccTenantKey;
  recommendation: { label: string; tone: Tone; why: string | null };
  fit: { score: number; band: string; tone: Tone; thresholds: string; capped: string | null };
  eligibility: { text: string; tone: Tone; lines: CompareLine[]; more: number };
  guarantee: { bond: string; headroom: string; after: string; tight: boolean; text: string } | null;
  team: { name: string; text: string; tone: Tone } | null;
  decision: { label: string; tone: Tone; by: string; at: string; note: string | null } | null;
}

const LINES_SHOWN = 4;
const VERDICT_TONE: Record<string, Tone> = { pursue: 'green', conditions: 'orange', discard: 'red' };
const STATE_ORDER: LineState[] = ['fail', 'at-risk', 'interpretation'];
const CAPPED: Record<string, string> = {
  'pq-fail': 'A PQ fail caps it at Recommend discard, whatever the score',
  'pq-fail-jv': 'Bidding alone fails the PQ: capped at Pursue with conditions (JV needed)',
  capacity: 'The bid team would be over capacity: Pursue becomes Pursue with conditions',
};

/** "Wed 11 Mar 2026 10:03" → "11 Mar, 10:03". */
const shortAt = (iso: string) => `${dateText(iso.slice(0, 10)).replace(/^\w+ /, '').replace(/ \d{4}$/, '')}, ${iso.slice(11, 16)}`;

function eligibilityOf(lines: EligibilityLine[]): { lines: CompareLine[]; more: number } {
  const watch = lines
    .filter((l) => STATE_ORDER.includes(l.state))
    .sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.reqId.localeCompare(b.reqId));
  return { lines: watch.slice(0, LINES_SHOWN).map((l) => ({ reqId: l.reqId, state: l.state, why: l.why })), more: Math.max(0, watch.length - LINES_SHOWN) };
}

function column(tenant: GccTenantKey, done: Record<string, string>): CompareColumn | null {
  const pack = dg1PackFor(tenant, HERO_ID, done);
  if (!pack) return null;
  const fit = pack.fit.result;
  const rec = pack.recommendation;
  const elig = pack.eligibility?.result;
  const { pursueAt, conditionsFrom } = fit.thresholds;
  const bandTone: Tone = fit.weighted >= pursueAt ? 'green' : fit.weighted >= conditionsFrom ? 'orange' : 'red';
  const b = pack.bond?.bond;
  const cap = pack.capacity;
  const rec1 = dg1RecordFor(tenant, HERO_ID, done);
  const cur = rec1.current;
  const hold = !cur && rec1.hold ? rec1.hold : null;

  return {
    tenant,
    recommendation: { label: rec.recommendation, tone: VERDICT_TONE[rec.verdict], why: rec.reasons[0] ?? null },
    fit: {
      score: Math.round(fit.weighted),
      band: fit.weighted >= pursueAt ? 'pursue band' : fit.weighted >= conditionsFrom ? 'conditions band' : 'below the conditions band',
      tone: bandTone,
      thresholds: `Pursue at ${pursueAt}, with conditions from ${conditionsFrom}`,
      capped: fit.capped ? CAPPED[fit.capped] : null,
    },
    eligibility: {
      text: elig?.text ?? 'No PQ requirements extracted',
      tone: !elig ? 'muted' : elig.verdict === 'eligible' ? (elig.counts.atRisk + elig.counts.interpretation ? 'orange' : 'green') : elig.verdict === 'eligible-with-jv' ? 'orange' : 'red',
      ...eligibilityOf(elig?.lines ?? []),
    },
    guarantee: b ? {
      bond: money(b.amount.amount, b.amount.ccy), headroom: money(b.headroom.amount, b.headroom.ccy), after: money(b.afterBid.amount, b.afterBid.ccy),
      tight: b.facilityTight, text: b.rateText,
    } : null,
    team: cap ? {
      name: cap.teamName,
      text: `${cap.withPct}% with this bid to submission (${cap.nowPct}% now); peaks at ${cap.peak.pct}% in ${cap.peak.month}`,
      tone: cap.peak.share > 1 ? 'red' : cap.withPct > cap.nowPct ? 'ink' : 'green',
    } : null,
    decision: cur ? {
      label: cur.decision === 'pursue' ? ('strategy' in cur && cur.strategy?.kind === 'jv' ? 'Pursue, as a JV' : 'Pursue') : cur.decision === 'discard' ? 'Discard' : 'Hold',
      tone: cur.decision === 'pursue' ? 'green' : cur.decision === 'discard' ? 'red' : 'orange',
      by: personById(cur.byId)?.name ?? cur.byId,
      at: shortAt(cur.at),
      note: cur.reasonCodes.length ? cur.reasonCodes.map(reasonLabel).join(', ') : cur.note ?? null,
    } : hold ? {
      label: 'Hold', tone: 'orange', by: personById(hold.byId)?.name ?? hold.byId, at: shortAt(hold.at), note: 'request' in hold ? hold.request.what : hold.note ?? null,
    } : null,
  };
}

/** The hero as every company received it: the same document, so the same title and issuer. */
export function compareSubject(): { id: string; title: string; issuer: string } | null {
  const t = GCC_DATA.najd.register.find((x) => x.id === HERO_ID);
  return t ? { id: t.id, title: t.title, issuer: t.issuer } : null;
}

/** One column per GCC tenant, each read with that tenant's own `done`. */
export function compareHero(state: { doneBy: Record<string, Record<string, string>> }): CompareColumn[] {
  return (Object.keys(GCC_DATA) as GccTenantKey[]).flatMap((k) => {
    const c = column(k, state.doneBy[k] ?? {});
    return c ? [c] : [];
  });
}
