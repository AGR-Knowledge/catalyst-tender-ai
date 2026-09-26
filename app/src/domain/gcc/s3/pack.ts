import { gccData, isGccTenantKey } from '@/data/gcc';
import type { GccTender, Money } from '@/data/gcc/types';
import type { Seat } from '@/data/people';
import { INPUT_SPECS, type PackInputKey, type PackRecommendation, type PackSectionId, type RiskRating } from '@/data/gcc/s3';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { money } from '@/domain/money';
import { s1Data } from '@/data/gcc/s1';
import { bidBondFor, eligibilityFor, validationsOf } from '@/domain/gcc/s1';
import { decisionState } from '@/domain/gcc/dg2/decision';
import { dayText, nowIso, readDone, stampText, type Done, type WriteError, type WriteResult } from './done';
import { clientBidsOf, WIN_AGENT, winFor, type ClientBidVM, type WinVM } from './win';
import { competitorsFor, type CompetitorsVM } from './competitors';
import { inputFields, inputsFor, type InputItem, type InputsVM } from './inputs';
import { freshnessFor, type FreshnessVM } from './freshness';
import { compareVersions, effectFor, marginRangeText, packVersionsFor, SECTION_TITLES, type PackIssueValue, type VersionCompare } from './versions';

/**
 * The Bid / No-Bid pack (spec §9): a sticky summary and sections 9.1–9.10,
 * each with its source and freshness ('current', 'stale' after a change the
 * pack hasn't absorbed, 'waiting' for a contributor's input, or
 * 'not-requested' when nobody asked for the input it is built on). The page
 * supplies what the viewer may see; nothing here checks roles.
 */

/**
 * From `can()`: `see.margin` and `see.positions`. Both are required (plan 021
 * 4.7), so a page can't forget positions and show the Commercial Manager, who
 * sees margin but not positions, the win probability.
 */
export interface PackViewer { canSeeMargin: boolean; canSeePositions: boolean }

export type SectionFreshness = 'current' | 'stale' | 'waiting' | 'not-requested';

export interface WaitingFor { inputKey: PackInputKey; label: string; ownerId: string; ownerName: string; due: string; dueText: string; state: InputItem['state'] }

/** An input the section is built on that nobody has requested. */
export interface NotRequested { inputKey: PackInputKey; label: string }

export interface PackSection<B> {
  id: PackSectionId;
  title: string;
  source: string;
  freshness: SectionFreshness;
  waitingFor?: WaitingFor;
  /** Inputs this section reads that were never requested; 'not-requested' when that is all of them. */
  notRequested?: NotRequested[];
  /** "No input requested: Top five contract risks". */
  notRequestedText?: string;
  body: B;
}

export const MASKED_TEXT = 'Masked for your role';
export const PROVISIONAL_FACILITY_TEXT = 'Provisional: Finance has not confirmed headroom for this bid yet';

/** A section body the viewer may not see. */
export interface MaskedBody { masked: true; text: string }
export const isMasked = (b: unknown): b is MaskedBody => !!b && typeof b === 'object' && (b as { masked?: unknown }).masked === true;
export const RECOMMENDATION_NOTE = 'Recommendation, not a decision';

export const RECOMMENDATION_LABEL: Record<PackRecommendation, string> = { bid: 'Bid', 'bid-with-conditions': 'Bid with conditions', 'no-bid': 'No-Bid' };

const RATING_ORDER: Record<RiskRating, number> = { high: 0, medium: 1, low: 2 };
const STANCE_LABEL: Record<string, string> = { accept: 'Accept', price: 'Price', qualify: 'Qualify', reject: 'Reject' };
const FEASIBILITY_LABEL: Record<string, string> = { yes: 'Yes', 'with-conditions': 'With conditions', no: 'No' };
const CONFIDENCE_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

// ---------------------------------------------------------------------------
// Section bodies

export interface RiskVM {
  clause: string; page?: number; risk: string; stance?: string; category?: string; rating: RiskRating;
  mitigation?: string; source: string; changed: boolean; kind: 'contract' | 'extraction-flag';
  /** Extraction flags: still open, or sent back to the agent (plan 007a's queue state). */
  flagState?: 'open' | 'sent-back';
}

export interface Section93 {
  kind: 'live' | 'snapshot';
  text: string;
  met: number;
  of: number;
  atRisk: number;
  /** Live result differs from what the pack froze. */
  refreshed: boolean;
  jv: string;
}

export interface Section94 {
  effort: { toDateWeeks: number; toGoWeeks: number; externalCost: Money; text: string };
  planning: null | { duration: string; longLead: string; peakManpower: number; keyPlant: string[]; clash: string; deliveryImpact: number };
  pd: null | { feasibility: string; note?: string; keyStaff: { name: string; role: string; availableFrom: string }[]; site: string };
  hr: null | { availability: { name: string; role: string; status: string }[]; nationalisation: string };
  portfolio: {
    asOf: string; currentPct: number; safePct: number; totalPct: number; ofSafePct: number;
    /** `estimate`: the tender has no Planning input, so its added load is the agent's estimate. `win` only for viewers who may see it. */
    ifWon: { tenderId: string; title: string; addPct: number; estimate: boolean; addText: string; win?: string }[];
    tone: 'green' | 'orange' | 'red';
    text: string;
  };
}

export interface Section95 {
  tenderValue: Money;
  /** Rate and validity from plan 007a's `bidBondFor`; `validityDays` is null without an opening date. */
  bidBond: { amount: Money; text: string; pct: number; validityDays: number | null; validityText: string; charges: string; leadTime: string; alreadyCommitted: boolean };
  /** `advanceGuarantee` only when the tender offers an advance. */
  ifWon: { performance: { pct: number; amount: Money; text: string }; advanceGuarantee?: { pct: number; amount: Money; text: string }; retentionPct: number };
  facility: { limit: Money; utilised: Money; committed: Money; headroom: Money; after: Money; afterText: string; asOf: string; confirmedBy: string };
  workingCapital: string;
  fx: string;
  bondTermsSource: string;
}

export type Section97 =
  | MaskedBody
  | { masked: false; low: number; high: number; range: string; text: string; basis: string; note?: string; confidence: string; costRisks: string[] };

export interface Section98 {
  recommendation: PackRecommendation;
  label: string;
  rationale: string;
  /** Each theme with the client records it rests on, if any. */
  winThemes: { text: string; cites: ClientBidVM[] }[];
  resourceAsk: string;
  topRisks: RiskVM[];
  presenterNote?: { text: string; byId: string; at: string };
  agent: string;
  note: string;
}

export interface Section910 { freshness: FreshnessVM; compare?: VersionCompare }

export interface PackSummary {
  recommendation: string;
  /** "58 ± 8", `MASKED_TEXT`, or null with no win model. */
  win: string | null;
  value: string;
  margin: string | null;
  facilityAfter: string;
  /** 'finance': this bid's Finance input; 'bank-facility': the company facility as Finance last confirmed it, so provisional. */
  facilityAfterBasis: FacilityAfterBasis;
  /** `PROVISIONAL_FACILITY_TEXT` while the basis is 'bank-facility'. */
  facilityAfterNote?: string;
  /** "2 of 5 · quorum needs 3", or `MASKED_TEXT`. */
  positions: string;
  sla: string;
  stale: boolean;
  staleBadge?: string;
}

export interface PackVM {
  tenderId: string;
  title: string;
  value: Money;
  valueText: string;
  version: number;
  generatedAt: string;
  issued: boolean;
  issuedAt?: string;
  /** DEC-4: value × win probability, once the pack is issued; null before, and for viewers masked from win probability. */
  weightedValue: Money | null;
  /** Bank guarantee headroom after this bid's bond. */
  facilityAfter: Money;
  facilityAfterBasis: FacilityAfterBasis;
  /** Where the headroom figure comes from, in words. */
  facilityAfterSource: string;
  summary: PackSummary;
  sections: {
    '9.1': PackSection<WinVM | MaskedBody | null>;
    '9.2': PackSection<CompetitorsVM | null>;
    '9.3': PackSection<Section93 | null>;
    '9.4': PackSection<Section94>;
    '9.5': PackSection<Section95 | null>;
    '9.6': PackSection<RiskVM[] | null>;
    '9.7': PackSection<Section97 | null>;
    '9.8': PackSection<Section98>;
    '9.9': PackSection<InputsVM>;
    '9.10': PackSection<Section910>;
  };
}

export type FacilityAfterBasis = 'finance' | 'bank-facility';

// ---------------------------------------------------------------------------

type Fields = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const mon = (v: unknown, fallback: Money): Money => (v && typeof v === 'object' && 'amount' in v ? (v as Money) : fallback);
const pctOf = (m: Money, pct: number): Money => ({ amount: Math.round((m.amount * pct) / 100), ccy: m.ccy });
const mText = (m: Money) => money(m.amount, m.ccy);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function submitted(inputs: InputsVM, key: PackInputKey): Fields | null {
  const i = inputs.items.find((x) => x.key === key);
  return i?.state === 'submitted' && i.fields ? i.fields : null;
}

interface InputState { waitingFor?: WaitingFor; notRequested: NotRequested[]; noneRequested: boolean }

/** Where the inputs among `keys` stand: the first requested one still missing, and those nobody requested. */
function inputState(inputs: InputsVM, keys: PackInputKey[]): InputState {
  const i = inputs.items.find((x) => keys.includes(x.key as PackInputKey) && x.state !== 'submitted');
  const notRequested = keys.filter((k) => !inputs.items.some((x) => x.key === k)).map((k) => ({ inputKey: k, label: INPUT_SPECS[k].label }));
  return {
    ...(i ? { waitingFor: { inputKey: i.key as PackInputKey, label: i.label, ownerId: i.ownerId, ownerName: i.ownerName, due: i.due, dueText: i.dueText, state: i.state } } : {}),
    notRequested,
    noneRequested: notRequested.length === keys.length,
  };
}

/** Freshness, in order: waiting for an input, no input requested at all, stale, current. */
function section<B>(id: PackSectionId, source: string, body: B, stale: PackSectionId[], inp?: InputState): PackSection<B> {
  const waitingFor = inp?.waitingFor;
  const notRequested = inp?.notRequested ?? [];
  return {
    id, title: SECTION_TITLES[id], source,
    freshness: waitingFor ? 'waiting' : inp?.noneRequested ? 'not-requested' : stale.includes(id) ? 'stale' : 'current',
    ...(waitingFor ? { waitingFor } : {}),
    ...(notRequested.length ? { notRequested, notRequestedText: `No input requested: ${notRequested.map((n) => n.label).join(', ')}` } : {}),
    body,
  };
}

/** Extraction flags still open in plan 007a's queue, a sent-back one included, as pack risks. */
export function extractionFlagsFor(tenant: string, tenderId: string, done: Done): RiskVM[] {
  return validationsOf(tenant, tenderId, done).filter((q) => q.state !== 'resolved').map(({ item: v, state }): RiskVM => ({
    kind: 'extraction-flag', clause: v.field, page: v.page, risk: `${v.field}: ${v.reason}`, rating: v.blocksDg1 ? 'high' : 'medium',
    source: `Extraction flag, p. ${v.page}`, changed: false, flagState: state === 'sent-back' ? 'sent-back' : 'open',
  }));
}

function risksOf(tenant: string, t: GccTender, legal: Fields | null, patches: { clause: string; rating: RiskRating; risk: string; source: string }[], done: Done): RiskVM[] | null {
  if (!legal) return null;
  const contract = arr<Fields>(legal.risks).slice(0, 5).map((r): RiskVM => {
    const patch = patches.find((p) => p.clause === txt(r.clause));
    return {
      kind: 'contract', clause: txt(r.clause), page: num(r.page),
      risk: patch?.risk ?? txt(r.risk),
      stance: STANCE_LABEL[txt(r.stance)] ?? txt(r.stance),
      category: txt(r.category),
      rating: (patch?.rating ?? txt(r.rating)) as RiskRating,
      mitigation: txt(r.mitigation),
      source: patch ? patch.source : `Compliance / Legal input: cl. ${txt(r.clause)}, p. ${num(r.page)}`,
      changed: !!patch,
    };
  });
  return [...contract, ...extractionFlagsFor(tenant, t.id, done)];
}

/** The versions' effects as the viewer may see them: the same mask as the compare view (`effectFor`). */
const maskFreshness = (f: FreshnessVM, viewer: PackViewer): FreshnessVM => ({ ...f, versions: f.versions.map((v) => ({ ...v, effects: v.effects.map((e) => effectFor(e, viewer)) })) });

export function packFor(tenant: string, tenderId: string, done: Done, viewer: PackViewer): PackVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const d = gccData(tenant);
  const t = d.register.find((x) => x.id === tenderId);
  const pv = packVersionsFor(tenant, tenderId, done);
  const fresh = freshnessFor(tenant, tenderId, done);
  if (!t || !pv.current || !fresh) return null;

  const cur = pv.current;
  const snap = cur.snapshot;
  const stale = fresh.stale?.affected ?? [];
  const staleAll: PackSectionId[] = fresh.stale ? [...stale, '9.10'] : [];
  const inputs = inputsFor(tenant, tenderId, done);
  const value: Money = { amount: t.value.amount, ccy: t.value.ccy };

  const seeMargin = viewer.canSeeMargin;
  const seeWin = viewer.canSeePositions;
  const masked: MaskedBody = { masked: true, text: MASKED_TEXT };

  // 9.1, 9.2
  const win = winFor(tenant, tenderId);
  const comps = competitorsFor(tenant, tenderId);
  const s91 = section('9.1', win ? `${WIN_AGENT}; ${plural(win.comparables, 'comparable bid')}` : 'No win model yet', win && !seeWin ? masked : win, staleAll);
  const s92 = section('9.2', comps ? 'Prequalified list, award notices, opening reports and market intelligence (synthetic records)' : 'No competitor intelligence on record yet', comps, staleAll);

  // 9.3
  const jvText = snap.jv
    ? `JV with ${snap.jv.partnerName}: ${snap.jv.lead === 'us' ? 'we lead' : `${snap.jv.partnerName} leads`}, our share ${snap.jv.ourSharePct}%`
    : 'Bidding as prime: no JV';
  let s93body: Section93 | null = null;
  let s93source = 'No eligibility on record';
  const live = t.requirements?.length ? eligibilityFor(tenant, tenderId, done) : null;
  if (live) {
    const { met, na, atRisk: risky, interpretation } = live.counts;
    const of = live.lines.length - na;
    const atRisk = risky + interpretation;
    const refreshed = !!snap.eligibility && (snap.eligibility.met !== met || snap.eligibility.of !== of);
    s93body = { kind: 'live', met, of, atRisk, refreshed, jv: jvText, text: `${met} of ${of} PQ lines met${atRisk ? `, ${atRisk} at risk` : ''}${refreshed ? ' (refreshed since the pack was generated)' : ''}` };
    s93source = 'Eligibility check against the credential vault (live)';
  } else if (snap.eligibility) {
    const { met, of } = snap.eligibility;
    s93body = { kind: 'snapshot', met, of, atRisk: 0, refreshed: false, jv: jvText, text: met === of ? `All PQ lines met at generation (${met} of ${of})` : `${met} of ${of} PQ lines met at generation` };
    s93source = `S1 eligibility roll-up, as at ${stampText(cur.generatedAt)}`;
  }
  const s93 = section('9.3', s93source, s93body, staleAll);

  // 9.4. A tender's added delivery load is the Planning input's; without one it is the agent's estimate.
  const plan = submitted(inputs, 'planning');
  const pd = submitted(inputs, 'pd');
  const hr = submitted(inputs, 'hr');
  const port = snap.portfolio;
  const totalPct = port.currentPct + port.ifWon.reduce((s, x) => s + x.addPct, 0);
  const ofSafePct = Math.round((totalPct / port.safePct) * 100);
  const n = port.ifWon.length;
  const ifWon = port.ifWon.map((x) => {
    const estimate = !inputFields(tenant, x.tenderId, 'planning', done);
    // Plan 021 4.8: only this tender's win. Another tender's is its own `can()` question, which the pack can't ask.
    const w = seeWin && x.tenderId === tenderId ? winFor(tenant, x.tenderId) : null;
    return {
      tenderId: x.tenderId, title: d.register.find((r) => r.id === x.tenderId)?.title ?? x.tenderId, addPct: x.addPct, estimate,
      addText: `+${x.addPct}${estimate ? ' (estimate)' : ''}`,
      ...(w ? { win: w.text } : {}),
    };
  });
  const estimates = ifWon.filter((x) => x.estimate).map((x) => `+${x.addPct} for ${x.tenderId === tenderId ? 'this bid' : x.title}`);
  const s94: Section94 = {
    effort: { ...snap.effort, text: `${snap.effort.toDateWeeks} people-weeks to date, ${snap.effort.toGoWeeks} to go; external cost ${mText(snap.effort.externalCost)}` },
    planning: plan ? {
      duration: `${num(plan.durationMonths)} months against ${num(plan.requiredMonths)} required`,
      longLead: txt(plan.longLead), peakManpower: num(plan.peakManpower), keyPlant: arr<string>(plan.keyPlant), clash: txt(plan.clash), deliveryImpact: num(plan.deliveryImpact),
    } : null,
    pd: pd ? {
      feasibility: FEASIBILITY_LABEL[txt(pd.feasibility)] ?? txt(pd.feasibility),
      ...(txt(pd.feasibilityNote) ? { note: txt(pd.feasibilityNote) } : {}),
      keyStaff: arr<{ name: string; role: string; availableFrom: string }>(pd.keyStaff), site: txt(pd.site),
    } : null,
    hr: hr ? { availability: arr<{ name: string; role: string; status: string }>(hr.availability), nationalisation: txt(hr.nationalisation) } : null,
    portfolio: {
      asOf: port.asOf, currentPct: port.currentPct, safePct: port.safePct, totalPct, ofSafePct,
      ifWon,
      tone: ofSafePct <= 100 ? 'green' : ofSafePct <= 115 ? 'orange' : 'red',
      text: `${totalPct}% of delivery capacity if ${n === 1 ? 'this bid wins' : n === 2 ? 'both bids win' : `all ${n} bids win`}, against a safe level of ${port.safePct}% (${ofSafePct}%)`
        + (estimates.length ? `. ${estimates.join(' and ')} ${estimates.length === 1 ? 'is an estimate' : 'are estimates'}: no Planning input` : ''),
    },
  };
  const s94sec = section('9.4', `Planning, Project Director and HR inputs; delivery load as of ${dayText(port.asOf)}`, s94, staleAll, inputState(inputs, ['planning', 'pd', 'hr']));

  // 9.5. The bid bond's rate, validity and the tender's guarantee terms are
  // plan 007a's (`bidBondFor`, the bond terms). Headroom after the bond reads
  // the Finance input once it is in; until then the company facility Finance
  // last confirmed (the DEC-6 figure), which is provisional for this bid.
  const fin = submitted(inputs, 'finance');
  const bb = bidBondFor(tenant, tenderId, done);
  const terms = s1Data(tenant).bonds.find((x) => x.tenderId === tenderId);
  const rate = bb?.rate ?? 0;
  const bond = pctOf(value, rate);
  const alreadyCommitted = d.facility.committed.some((c) => c.tenderId === tenderId && c.kind === 'bid bond');
  const companyHeadroom = d.facility.limit.amount - d.facility.utilised.amount - d.facility.committed.reduce((s, c) => s + c.amount.amount, 0);
  const headroomBase: Money = fin ? mon(fin.headroom, { amount: 0, ccy: value.ccy }) : { amount: companyHeadroom, ccy: d.facility.limit.ccy };
  const facilityAfter: Money = { amount: headroomBase.amount - (alreadyCommitted ? 0 : bond.amount), ccy: headroomBase.ccy };
  const facilityAfterBasis: FacilityAfterBasis = fin ? 'finance' : 'bank-facility';
  const facilityAfterSource = fin
    ? `Finance / Treasury input, as of ${dayText(txt(fin.asOf))}`
    : `Company facility as confirmed by Finance on ${dayText(d.facility.asOf)}; this bid's Finance input is still due`;
  let s95: Section95 | null = null;
  if (fin) {
    const zero: Money = { amount: 0, ccy: value.ccy };
    const headroom = mon(fin.headroom, zero);
    const perfPct = terms?.performancePct ?? 0;
    const advPct = terms?.advancePct;
    const perf = pctOf(value, perfPct);
    const apg = advPct ? pctOf(value, advPct) : null;
    const validity = bb?.validityDays != null ? `valid ${bb.validityDays} days` : bb?.validityText.toLowerCase() ?? 'validity not stated';
    s95 = {
      tenderValue: value,
      bidBond: {
        amount: bond, pct: rate, validityDays: bb?.validityDays ?? null, validityText: bb?.validityText ?? 'Validity not stated', alreadyCommitted,
        text: bb?.rate == null ? 'No bid bond stated' : `${mText(bond)} (${rate}% of the estimate), ${validity}`,
        charges: `Bank charges ${num(fin.bondCharges)}% a year`,
        leadTime: `Bank lead time ${plural(num(fin.bankLeadDays), 'working day')}`,
      },
      ifWon: {
        performance: { pct: perfPct, amount: perf, text: `Performance bond ${mText(perf)} (${perfPct}%)` },
        ...(apg && advPct ? { advanceGuarantee: { pct: advPct, amount: apg, text: `Advance payment guarantee ${mText(apg)}, equal to the ${advPct}% advance` } } : {}),
        retentionPct: snap.bonds.retentionPct,
      },
      facility: {
        limit: mon(fin.limit, zero), utilised: mon(fin.utilised, zero), committed: mon(fin.committed, zero), headroom,
        after: facilityAfter, afterText: `${mText(facilityAfter)} headroom after this bid's bond`,
        asOf: txt(fin.asOf), confirmedBy: inputs.items.find((i) => i.key === 'finance')?.ownerName ?? '',
      },
      workingCapital: txt(fin.workingCapital),
      fx: txt(fin.fx),
      bondTermsSource: terms?.source ?? 'Tender documents',
    };
  }
  const s95sec = section('9.5', fin ? `Finance / Treasury input, as of ${dayText(txt(fin.asOf))}` : 'Finance / Treasury input', s95, staleAll, inputState(inputs, ['finance']));

  // 9.6
  const patches = cur.effects.flatMap((e) => (e.patch?.risk ? [e.patch.risk] : []));
  const risks = risksOf(tenant, t, submitted(inputs, 'legal'), patches, done);
  const s96 = section('9.6', patches.length ? 'Compliance / Legal input, with Addendum changes; extraction flags' : 'Compliance / Legal input; extraction flags', risks, staleAll, inputState(inputs, ['legal']));

  // 9.7
  const comm = submitted(inputs, 'commercial');
  let s97: Section97 | null = null;
  if (comm) {
    if (!seeMargin) {
      s97 = masked;
    } else {
      const marginPatch = [...cur.effects].reverse().find((e) => e.patch?.margin)?.patch;
      const [low, high] = marginPatch?.margin ?? (arr<number>(comm.margin) as [number, number]);
      const range = marginRangeText([low, high]);
      const basis = txt(comm.basis);
      s97 = {
        masked: false, low, high, range, basis,
        ...(marginPatch?.marginNote ? { note: marginPatch.marginNote } : {}),
        text: `${range} on ${basis}${marginPatch?.marginNote ? `; ${marginPatch.marginNote}` : ''}`,
        confidence: CONFIDENCE_LABEL[txt(comm.confidence)] ?? txt(comm.confidence),
        costRisks: arr<string>(comm.costRisks),
      };
    }
  }
  const s97sec = section('9.7', "Commercial Manager's preliminary estimate: a range, not a price", s97, staleAll, inputState(inputs, ['commercial']));

  // 9.8
  const note = readDone<{ text: string; at: string; byId: string }>(done, `pack-note:${tenderId}`);
  const rec = snap.recommendation;
  const s98 = section<Section98>('9.8', `${WIN_AGENT}; presenter's note by the Bid Manager`, {
    recommendation: rec.recommendation, label: RECOMMENDATION_LABEL[rec.recommendation],
    rationale: rec.rationale,
    winThemes: rec.winThemes.map((w) => (typeof w === 'string' ? { text: w, cites: [] } : { text: w.text, cites: clientBidsOf(w.cites) })),
    resourceAsk: rec.resourceAsk,
    topRisks: [...(risks ?? [])].sort((a, b) => RATING_ORDER[a.rating] - RATING_ORDER[b.rating]).slice(0, 3),
    ...(note ? { presenterNote: note } : {}),
    agent: WIN_AGENT, note: RECOMMENDATION_NOTE,
  }, staleAll);

  // 9.9, 9.10. Viewers masked from margin get the input status without the submitted fields,
  // and the versions without their margin figures (the sections above already show what they may see).
  const s99 = section('9.9', 'Input requests and submissions', seeMargin ? inputs : { ...inputs, items: inputs.items.map(({ fields: _f, ...i }) => i) }, staleAll);
  const first = pv.versions[0];
  const s910 = section<Section910>('9.10', 'Pack versions, addenda and credential renewals', {
    freshness: seeMargin && seeWin ? fresh : maskFreshness(fresh, viewer),
    ...(cur.version > first.version ? { compare: compareVersions(tenant, tenderId, first.version, cur.version, viewer) } : {}),
  }, staleAll);

  // Sticky summary
  const ds = decisionState(tenant, tenderId, done);
  // DEC-4 counts a tender once its pack is with the committee (as plan 017's step facts do).
  const weightedValue = win && seeWin && pv.issued ? { amount: Math.round((value.amount * win.p) / 100), ccy: value.ccy } : null;
  const summary: PackSummary = {
    recommendation: RECOMMENDATION_LABEL[rec.recommendation],
    win: win ? (seeWin ? win.text : MASKED_TEXT) : null,
    value: mText(value),
    margin: s97 ? (s97.masked ? MASKED_TEXT : s97.range) : null,
    facilityAfter: mText(facilityAfter),
    facilityAfterBasis,
    ...(facilityAfterBasis === 'bank-facility' ? { facilityAfterNote: PROVISIONAL_FACILITY_TEXT } : {}),
    positions: seeWin ? ds.positions.quorum.short : MASKED_TEXT,
    sla: ds.slaText,
    stale: !!fresh.stale,
    ...(fresh.stale ? { staleBadge: 'Stale' } : {}),
  };

  return {
    tenderId, title: t.title, value, valueText: mText(value),
    version: cur.version, generatedAt: cur.generatedAt,
    issued: !!cur.issuedAt, ...(cur.issuedAt ? { issuedAt: cur.issuedAt } : {}),
    weightedValue, facilityAfter, facilityAfterBasis, facilityAfterSource, summary,
    sections: { '9.1': s91, '9.2': s92, '9.3': s93, '9.4': s94sec, '9.5': s95sec, '9.6': s96, '9.7': s97sec, '9.8': s98, '9.9': s99, '9.10': s910 },
  };
}

// ---------------------------------------------------------------------------
// Issue, presenter's note, lenses

/** Inputs still missing: issuing needs a reason while there are any. */
export function issueBlockers(tenant: string, tenderId: string, done: Done): InputItem[] {
  return inputsFor(tenant, tenderId, done).items.filter((i) => i.state !== 'submitted');
}

/** "Issue pack to committee": starts the 24 h DG2 clock on the first issue; a later issue doesn't restart it. */
export function packIssueWrite(tenant: string, tenderId: string, done: Done, byId: string, reason?: string): WriteResult | WriteError {
  const pv = packVersionsFor(tenant, tenderId, done);
  if (!pv.current) return { error: 'This tender has no pack yet' };
  if (pv.current.issuedAt) return { error: `Pack v${pv.current.version} is already with the committee` };
  const blockers = issueBlockers(tenant, tenderId, done);
  const why = reason?.trim();
  if (blockers.length && !why) return { error: `Give a reason to issue with ${plural(blockers.length, 'input')} outstanding` };
  const at = nowIso();
  const value: PackIssueValue = {
    version: pv.current.version, at, byId, firstAt: pv.firstIssuedAt ?? at,
    ...(blockers.length ? { reason: why, outstanding: blockers.length } : {}),
  };
  const clock = pv.firstIssuedAt ? `DG2 clock unchanged: it runs from the first issue, ${stampText(pv.firstIssuedAt)}` : `DG2 clock started: ${GATE_SLA_HOURS.DG2} h`;
  return {
    key: `pack-issue:${tenderId}`,
    value: JSON.stringify(value),
    audit: {
      actorId: byId, action: 'Pack issued to the committee', target: tenderId,
      detail: [`v${value.version}`, clock, blockers.length ? `Issued with ${plural(blockers.length, 'input')} outstanding: ${why}` : ''].filter(Boolean).join(' · '),
    },
  };
}

/** The Bid Manager's presenter's note on §9.8. Text only: the pack's numbers stay locked. */
export function packNoteWrite(tenderId: string, text: string, byId: string): WriteResult | WriteError {
  const t = text.trim();
  if (!t) return { error: 'Write the note first' };
  return {
    key: `pack-note:${tenderId}`,
    value: JSON.stringify({ text: t, at: nowIso(), byId }),
    audit: { actorId: byId, action: "Presenter's note saved", target: tenderId, detail: 'Narrative only; the numbers are locked' },
  };
}

/** Where the pack opens for each reader (catalogue §C.5). */
export function lensFor(who: Seat | 'hot' | 'bid'): PackSectionId | 'top' {
  switch (who) {
    case 'cfo': return '9.5';
    case 'technical': return '9.6';
    case 'operations': return '9.4';
    case 'sector': return '9.1';
    default: return 'top';
  }
}
