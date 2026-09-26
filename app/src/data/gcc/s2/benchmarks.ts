import type { GccTenantKey } from '../index';
import type { BestFitWeights } from './types';

/**
 * Sourcing benchmarks and rules (spec §8, gcc-demo-data §10). Each fact is
 * tagged: [V] verified, [L] well established, [A] a demo assumption to verify
 * before a client meeting.
 */

/** VAT by country, per cent [L]. Qatar and Kuwait have no VAT. */
export const VAT_PCT: Record<string, number> = { SA: 15, AE: 5, OM: 5, BH: 10, QA: 0, KW: 0 };

export const GCC_COUNTRIES = ['SA', 'AE', 'QA', 'OM', 'KW', 'BH'];

/** GCC common customs duty on equipment imported from outside the GCC, per cent [L]. Goods of GCC origin move duty-free. */
export const CUSTOMS_DUTY_PCT = 5;

export type OriginRegion = 'Europe' | 'Asia' | 'GCC';

/** Freight to site as a share of the ex-works value, per cent [A]. */
export const FREIGHT_PCT: Record<OriginRegion, number> = { Europe: 4, Asia: 3.5, GCC: 1 };

/** Origin region by country [L]. A country missing here is priced at the Europe rate, with a note. */
export const REGION_OF: Record<string, OriginRegion> = {
  DE: 'Europe', IT: 'Europe', SE: 'Europe', NL: 'Europe', PL: 'Europe', GB: 'Europe', IE: 'Europe', PT: 'Europe',
  FR: 'Europe', ES: 'Europe', AT: 'Europe', CZ: 'Europe', TR: 'Europe',
  KR: 'Asia', CN: 'Asia', JP: 'Asia', IN: 'Asia', MY: 'Asia',
  SA: 'GCC', AE: 'GCC', QA: 'GCC', OM: 'GCC', KW: 'GCC', BH: 'GCC',
};

/** Allowances for common exclusions, as a share of the package value, per cent [A]. `match` is looked for in the quote's words. */
export const EXCLUSION_ALLOWANCES: { match: string; label: string; pct: number }[] = [
  { match: 'installation supervision', label: 'Installation supervision', pct: 2.5 },
  { match: 'commissioning spares', label: 'Commissioning spares', pct: 1.5 },
  { match: 'factory tests witnessed', label: 'Witnessed factory tests', pct: 0.5 },
];

/** RFQ reply window, in working days of the tenant's country [A]. */
export const RFQ_REPLY_WORKING_DAYS = 10;
/** Time of day a reply falls due, local. */
export const RFQ_REPLY_TIME = '17:00';
/** Reminders start this many calendar days before the reply date, then run daily (ui-direction §7.3). */
export const REMINDER_DAYS_BEFORE = 3;
/** Time of day the agent sends reminders, local. */
export const REMINDER_TIME = '09:00';
/**
 * Escalation rule (ui-direction §7.3, "Escalation", decided 2026-09-26): an RFQ
 * with no reply at its reply time is "Overdue, reminder sent"; still unanswered,
 * it becomes "No response, escalated" to the Procurement Lead at this time on
 * the next working day of the tenant's calendar.
 */
export const ESCALATION_TIME = '08:00';

/** DG1 pursue to every package issued (spec KPI, SRC-1), hours. */
export const RFQ_CLOCK_HOURS = 24;
/** The live clock turns orange with this many hours left and packages unsent. */
export const RFQ_CLOCK_WARN_HOURS = 6;

/** Supplier clarification answer SLA, working days [A]. */
export const CLARIFICATION_SLA_WORKING_DAYS = 3;

/** Required quote validity: the tender's bid validity plus a margin, and never less than a floor [A]. */
export const QUOTE_VALIDITY_MARGIN_DAYS = 30;
export const QUOTE_VALIDITY_FLOOR_DAYS = 120;

/** Sanctions and anti-bribery screening is current for this many days (ui-direction §7.3). */
export const RESCREEN_DAYS = 180;

/** An advance above this share of the quote gets a cash-flow note, per cent. The main contracts allow up to 10% [V: GTPL advance payment]. */
export const ADVANCE_NOTE_ABOVE_PCT = 10;

/** Default subcontracting cap where the tender states none, per cent (the KSA model booklet's §23 figure) [V]. */
export const DEFAULT_SUBCONTRACT_CAP_PCT = 30;

/** A package is covered with this many compliant, levelled quotes (spec §8, SRC-2). */
export const QUOTES_TO_COVER = 3;

/** Shortlist size the agent recommends (spec §8.3). */
export const SHORTLIST_MAX = 6;
export const SHORTLIST_MAX_SENDABLE = 5;

/** Buyer time standards for SRC-11, minutes, always labelled "estimated" [A]. */
export const BUYER_MINUTES = { nudge: 10, parsedQuote: 45, levelledQuote: 60 };

/** Days after the pursue by which each kick-off item is due (spec §8.1) [A]. Hours for the sourcing steps; working days for inputs. */
export const KICKOFF_DUE = {
  packagingHours: 6,
  shortlistsHours: 12,
  inputs: { 'method-statement': 10, 'hse-plan': 10, 'key-cvs': 5, programme: 7, estimate: 10, 'design-basis': 10 },
} as const;

/** Best-fit weights per tenant (spec §8.7), each summing to 100 [A]. */
export const BEST_FIT_WEIGHTS: Record<GccTenantKey, BestFitWeights> = {
  najd: { price: 40, technical: 20, delivery: 10, qhse: 10, capacity: 5, leadTime: 5, icv: 10 },
  // MEP: delivery and lead time matter more on fast-track buildings.
  corniche: { price: 40, technical: 20, delivery: 15, qhse: 10, capacity: 5, leadTime: 10, icv: 0 },
  // Sewer rehabilitation in live streets: technical and QHSE weigh more.
  dafna: { price: 35, technical: 25, delivery: 10, qhse: 15, capacity: 5, leadTime: 5, icv: 5 },
  // Oman government tenders score in-country value.
  batinah: { price: 45, technical: 15, delivery: 10, qhse: 10, capacity: 5, leadTime: 5, icv: 10 },
  // Tunnelling: capacity and QHSE carry more of the risk.
  qurain: { price: 35, technical: 20, delivery: 10, qhse: 15, capacity: 10, leadTime: 5, icv: 5 },
};
