import { gccData, isGccTenantKey } from '@/data/gcc';
import { COMPETITORS, EVIDENCE, type Evidence, type PricingPosture } from '@/data/gcc/s3';
import type { Money } from '@/data/gcc/types';
import { money } from '@/domain/money';
import { winModelOf } from './win';

/**
 * Likely bidders (pack §9.2). Every claim shows its evidence; a claim with no
 * evidence, or citing evidence that doesn't exist, is dropped and counted
 * (spec guardrail: no source, no claim). GOV-4 later counts these
 * activations.
 */

export interface EvidenceChip { id: string; kind: Evidence['kind']; title: string; date: string; url: string }

export interface CompetitorVM {
  id: string;
  name: string;
  country: string;
  profile: string;
  pricingPosture: PricingPosture;
  postureLabel: string;
  usuallyJv: boolean;
  /** Also on this tenant's JV partner list: partners and rivals at once. */
  alsoOurPartner: boolean;
  claims: { text: string; evidence: EvidenceChip[] }[];
  recentWins: { title: string; year: number; value?: Money; valueText?: string; evidence: EvidenceChip }[];
}

export interface CompetitorsVM {
  /** Prequalified or likely bidders, the tenant included. */
  bidders: number;
  /** True when the tenant's own bid is in the bidders list. */
  weBid: boolean;
  competitors: CompetitorVM[];
  suppressed: number;
  suppressedText?: string;
}

const POSTURE: Record<PricingPosture, string> = {
  aggressive: 'Aggressive on price', market: 'Prices at market', premium: 'Prices at a premium',
};

const chip = (e: Evidence): EvidenceChip => ({ id: e.id, kind: e.kind, title: e.title, date: e.date, url: e.url });
const evidenceOf = (ids: string[]) => ids.flatMap((id) => EVIDENCE.filter((e) => e.id === id)).map(chip);

export const suppressedText = (n: number) => `${n} uncited claim${n === 1 ? '' : 's'} suppressed (no source, no claim)`;

export function competitorsFor(tenant: string, tenderId: string): CompetitorsVM | null {
  const model = winModelOf(tenant, tenderId);
  if (!model?.bidders || !isGccTenantKey(tenant)) return null;
  const partnerNames = new Set(gccData(tenant).partners.map((p) => p.name));
  let suppressed = 0;

  const competitors = model.bidders.flatMap((id) => COMPETITORS.filter((c) => c.id === id)).map((c): CompetitorVM => {
    const claims = c.claims.flatMap((cl) => {
      const evidence = evidenceOf(cl.evidenceIds);
      if (!evidence.length) {
        suppressed++;
        return [];
      }
      return [{ text: cl.text, evidence }];
    });
    const recentWins = c.recentWins.flatMap((w) => {
      const [evidence] = evidenceOf([w.evidenceId]);
      if (!evidence) {
        suppressed++;
        return [];
      }
      return [{ title: w.title, year: w.year, ...(w.value ? { value: w.value, valueText: money(w.value.amount, w.value.ccy) } : {}), evidence }];
    });
    return {
      id: c.id, name: c.name, country: c.country, profile: c.profile,
      pricingPosture: c.pricingPosture, postureLabel: POSTURE[c.pricingPosture],
      usuallyJv: !!c.usuallyJv,
      alsoOurPartner: partnerNames.has(c.name),
      claims, recentWins,
    };
  });

  return {
    bidders: model.bidders.length,
    weBid: model.bidders.includes(tenant),
    competitors,
    suppressed,
    ...(suppressed ? { suppressedText: suppressedText(suppressed) } : {}),
  };
}
