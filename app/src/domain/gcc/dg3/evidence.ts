import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Money } from '@/data/gcc/types';
import type { Lifecycle, S7Facts } from '@/data/gcc/lifecycle';
import { dg3EvidenceRecord, type Dg3Evidence, type DeviationPosition, type RiskRating } from '@/data/gcc/dg3';
import { TENANTS } from '@/data/tenants';
import { DEMO_TODAY, addDays, calendarDaysBetween, dateText } from '@/domain/calendar';
import { money } from '@/domain/money';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { currentOf, lifecyclesOf, lifecycle } from '@/domain/gcc/lifecycle';
import { pctText, type Done } from '@/domain/gcc/s3/done';
import { reissuesOf, type Dg3LineState } from './keys';

/**
 * The DG3 evidence (plan 018 step 1.3, dashboards.md §9): the lines the Head
 * of Tendering reads before approving submission, each passing, failing or
 * for information. `evaluateDg3` is pure, so the dev check can hand it any
 * case; `dg3EvidenceFor` reads one tender's pack as Compliance issued it (the
 * seed's Stage 7 facts), with any re-issue fix applied. Approval needs every
 * blocking line to pass.
 */

export interface Dg3Item {
  text: string;
  /** Who owns it (a risk) or signs it (a signatory). */
  ownerId?: string;
  /** "Qualified", "High", "Ready". */
  tag?: string;
}

export interface Dg3Line {
  key: string;
  label: string;
  state: Dg3LineState;
  text: string;
  /** A failing blocking line stops approval. */
  blocking: boolean;
  /** What fails, in a few words, for the dashboard row: "initial guarantee validity". */
  short?: string;
  /**
   * For a viewer without `see.margin`, when the line states a price or margin
   * figure: the part they may read, and the masked chip's words.
   */
  mask?: Dg3Mask;
  /** What to ask Compliance to fix, in a sentence with no price or margin figure (the send-back note starts from it). */
  ask?: string;
  items?: Dg3Item[];
}

export interface Dg3Mask { visible: string; label: string }

/** A masked line as one plain sentence, for lists: "Minimum margin condition: met (figures masked for your role)". */
export const maskedSentence = (m: Dg3Mask) => (m.visible ? `${m.visible} (${m.label[0].toLowerCase()}${m.label.slice(1)})` : m.label);

/** The tender facts a check needs, from its lifecycle and the tenant. */
export interface Dg3Tender {
  value: Money;
  deadline?: { date: string; time: string };
  portalName: string;
  tzLabel: string;
}

export interface Dg3Evaluation {
  lines: Dg3Line[];
  /** No blocking line fails. */
  ready: boolean;
  failing: Dg3Line[];
  passed: number;
  info: number;
  /** "Evidence complete", or "1 check fails: initial guarantee validity". */
  summary: string;
}

/** How long past the requirement the bank extends the guarantee when Compliance re-issues with the fix (plan 018 step 2.3). */
export const BANK_EXTENSION_DAYS = 7;

export const MASKED_PRICE = 'Final price masked for your role';

const POSITION_LABEL: Record<DeviationPosition, string> = { accepted: 'Accepted', qualified: 'Qualified', rejected: 'Rejected' };
const RATING_LABEL: Record<RiskRating, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const DEMO_YEAR = DEMO_TODAY.slice(0, 4);
/** "Sat 20 Jun", with the year only outside the demo year. */
export const dayText = (iso: string) => {
  const d = dateText(iso.slice(0, 10));
  return iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
};
/** "Sat 7 Mar 16:00": a moment on a DG3 screen. */
export const stampOf = (iso: string) => `${dayText(iso)} ${iso.slice(11, 16)}`;
const full = (m: Money) => money(m.amount, m.ccy, { full: true });
const byPosition = (ev: Dg3Evidence, p: DeviationPosition) => ev.deviations.filter((d) => d.position === p).length;

export function evaluateDg3(ev: Dg3Evidence, facts: Pick<S7Facts, 'requirements' | 'mandatoryGaps'>, tender: Dg3Tender, now: string = DEMO_NOW): Dg3Line[] {
  const lines: Dg3Line[] = [];

  // Requirements evidenced; a mandatory gap blocks.
  const gaps = facts.mandatoryGaps;
  lines.push({
    key: 'requirements', label: 'Requirements evidenced', state: gaps ? 'fail' : 'pass', blocking: true,
    text: `${facts.requirements.evidenced} of ${facts.requirements.total} evidenced · ${plural(gaps, 'mandatory gap')}`,
    ...(gaps ? { short: plural(gaps, 'mandatory gap') } : {}),
  });

  // Each DG2 condition: a minimum margin is checked against the final margin.
  ev.dg2Conditions.forEach((c, i) => {
    const key = `condition-${i + 1}`;
    if (c.kind === 'min-margin' && c.minPct !== undefined) {
      const met = ev.marginPct >= c.minPct;
      lines.push({
        key, label: 'DG2 condition', state: met ? 'pass' : 'fail', blocking: true,
        text: `${c.text}: ${met ? 'met' : 'not met'}, ${pctText(ev.marginPct)}`,
        mask: { visible: `Minimum margin condition: ${met ? 'met' : 'not met'}`, label: 'Figures masked for your role' },
        ...(met ? {} : { short: 'minimum margin', ask: 'The final margin is below the DG2 minimum: re-check the price with Commercial' }),
      });
    } else {
      lines.push({ key, label: 'DG2 condition', state: 'info', blocking: false, text: `${c.text}: tracked on the bid workspace` });
    }
  });

  // The final price, for information.
  const diff = ((ev.finalPrice.amount - tender.value.amount) / tender.value.amount) * 100;
  const rounded = Math.round(Math.abs(diff) * 10) / 10;
  lines.push({
    key: 'price', label: 'Final price', state: 'info', blocking: false,
    text: `${money(ev.finalPrice.amount, ev.finalPrice.ccy)}, ${rounded ? `${pctText(rounded)} ${diff < 0 ? 'under' : 'over'} the` : 'equal to the'} ${money(tender.value.amount, tender.value.ccy)} estimate`,
    mask: { visible: '', label: MASKED_PRICE },
  });

  // The initial guarantee: its amount against the tender's share of the price, its expiry against the date it must hold to.
  const b = ev.bond;
  const required = Math.round((ev.finalPrice.amount * b.requiredPct) / 100);
  const amountOk = b.amount.amount >= required;
  const short = calendarDaysBetween(b.validTo, b.requiredTo);
  const validOk = short <= 0;
  const validText = `Valid to ${dayText(b.validTo)}, required to ${dayText(b.requiredTo)}: ${validOk ? 'met' : `${plural(short, 'day')} short`}`;
  const amountText = amountOk
    ? `${full(b.amount)}, ${b.requiredPct}% of the bid price`
    : `${full(b.amount)}, below ${b.requiredPct}% of the bid price (${full({ amount: required, ccy: b.amount.ccy })})`;
  lines.push({
    key: 'guarantee', label: 'Initial guarantee', state: amountOk && validOk ? 'pass' : 'fail', blocking: true,
    text: `${validText} · ${amountText}`,
    // The amount is a share of the price, so it would give the price away.
    mask: { visible: `${validText} · Amount ${amountOk ? 'meets' : 'is below'} ${b.requiredPct}% of the bid price`, label: 'Amount masked for your role' },
    ...(!validOk && !amountOk ? { short: 'initial guarantee amount and validity' } : !validOk ? { short: 'initial guarantee validity' } : !amountOk ? { short: 'initial guarantee amount' } : {}),
    ...(validOk && amountOk ? {} : {
      ask: [
        !validOk ? `The initial guarantee is valid to ${dayText(b.validTo)}; the tender needs it to ${dayText(b.requiredTo)} (${plural(short, 'day')} short). Ask the bank to extend it` : '',
        !amountOk ? `The initial guarantee is below ${b.requiredPct}% of the bid price. Ask the bank to raise it` : '',
      ].filter(Boolean).join('. '),
    }),
    items: [{ text: b.basis }, ...(b.note ? [{ text: b.note }] : [])],
  });

  // Contract deviations: a rejected clause makes the bid non-compliant.
  const rejected = byPosition(ev, 'rejected');
  lines.push({
    key: 'deviations', label: 'Contract deviations', state: rejected ? 'fail' : 'pass', blocking: true,
    text: `${plural(ev.deviations.length, 'position')}: ${byPosition(ev, 'accepted')} accepted, ${byPosition(ev, 'qualified')} qualified, ${rejected ? `${rejected} rejected` : 'none rejected'}`,
    ...(rejected ? { short: plural(rejected, 'rejected clause'), ask: 'A contract clause is rejected, which makes the bid non-compliant: qualify it or accept it' } : {}),
    items: ev.deviations.map((d) => ({ text: `${d.clause}: ${d.text}`, tag: POSITION_LABEL[d.position] })),
  });

  // Top risks: each needs an owner.
  const unowned = ev.risks.filter((r) => !r.ownerId).length;
  lines.push({
    key: 'risks', label: 'Top risks', state: unowned ? 'fail' : 'pass', blocking: true,
    text: unowned ? `${unowned} of ${plural(ev.risks.length, 'top risk')} without an owner` : `${plural(ev.risks.length, 'top risk')}, each with an owner`,
    ...(unowned ? { short: plural(unowned, 'risk without an owner', 'risks without an owner'), ask: 'Name an owner for every top risk' } : {}),
    items: ev.risks.map((r) => ({ text: r.text, ...(r.ownerId ? { ownerId: r.ownerId } : {}), tag: RATING_LABEL[r.rating] })),
  });

  // Signatories.
  const ready = ev.signatories.filter((s) => s.ready).length;
  const waiting = ev.signatories.length - ready;
  lines.push({
    key: 'signatories', label: 'Signatories', state: waiting ? 'fail' : 'pass', blocking: true,
    text: `${ready} of ${ev.signatories.length} ready`,
    ...(waiting ? { short: plural(waiting, 'signatory not ready', 'signatories not ready'), ask: 'Get every signatory ready before submission' } : {}),
    items: ev.signatories.map((s) => ({ text: s.note ? `${s.label} (${s.note})` : s.label, ownerId: s.personId, tag: s.ready ? 'Ready' : 'Not ready' })),
  });

  // Portal and deadline: the bid can still be submitted.
  const dl = tender.deadline;
  if (!dl) {
    lines.push({ key: 'portal', label: 'Portal and deadline', state: 'info', blocking: false, text: `${tender.portalName} · no deadline on record` });
  } else {
    const passed = `${dl.date}T${dl.time}` < now;
    const days = calendarDaysBetween(now.slice(0, 10), dl.date);
    const when = `${dayText(dl.date)}, ${dl.time}${tender.tzLabel ? ` ${tender.tzLabel}` : ''}`;
    const until = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    lines.push({
      key: 'portal', label: 'Portal and deadline', state: passed ? 'fail' : 'pass', blocking: true,
      text: passed ? `${tender.portalName} · ${when}: the deadline has passed` : `${tender.portalName} · ${when} (${until})`,
      ...(passed ? { short: 'deadline passed' } : {}),
    });
  }
  return lines;
}

export function summarise(lines: Dg3Line[]): Dg3Evaluation {
  const failing = lines.filter((l) => l.state === 'fail');
  const blocking = failing.filter((l) => l.blocking);
  return {
    lines,
    ready: blocking.length === 0,
    failing,
    passed: lines.filter((l) => l.state === 'pass').length,
    info: lines.filter((l) => l.state === 'info').length,
    summary: failing.length
      ? `${failing.length} ${failing.length === 1 ? 'check fails' : 'checks fail'}: ${failing.map((l) => l.short ?? l.label.toLowerCase()).join(', ')}`
      : 'Evidence complete',
  };
}

/** "7 checks passed, 1 for information". */
export function evidenceText(e: Pick<Dg3Evaluation, 'passed' | 'info'> & { failed: number }): string {
  return [
    plural(e.passed, 'check passed', 'checks passed'),
    e.failed ? `${e.failed} failed` : '',
    e.info ? `${e.info} for information` : '',
  ].filter(Boolean).join(', ');
}

/* ------------------------------------------------------------ the seed */

export interface Dg3Seed { l: Lifecycle; facts: S7Facts & { dg3IssuedAt: string }; evidence: Dg3Evidence }

/**
 * The tender as it waits at DG3 in the seed, with its pack. DG3 reads the
 * seed's lifecycle, not the demo's, so the pack stays as Compliance issued it
 * once a decision moves the tender on (and the applier, which calls this,
 * never reads its own output).
 */
export function dg3SeedOf(tenant: string, tenderId: string): Dg3Seed | null {
  if (!isGccTenantKey(tenant)) return null;
  const evidence = dg3EvidenceRecord(tenant, tenderId);
  const l = evidence ? lifecycle(tenant, tenderId) : undefined;
  if (!evidence || !l || l.facts?.stage !== 7 || !l.facts.dg3IssuedAt) return null;
  return { l, facts: { ...l.facts, dg3IssuedAt: l.facts.dg3IssuedAt }, evidence };
}

/** The seed's tenders waiting at DG3 with a pack, soonest SLA first. */
export function dg3Tenders(tenant: string): string[] {
  if (!isGccTenantKey(tenant)) return [];
  return lifecyclesOf(tenant)
    .filter((l) => !l.closedAt && currentOf(l).step === 'dg3-issued' && l.facts?.stage === 7 && !!l.facts.dg3IssuedAt && !!dg3EvidenceRecord(tenant, l.tenderId))
    .sort((a, b) => ((a.facts as S7Facts).dg3IssuedAt ?? '').localeCompare((b.facts as S7Facts).dg3IssuedAt ?? ''))
    .map((l) => l.tenderId);
}

export function dg3TenderOf(tenant: string, l: Lifecycle, ev: Dg3Evidence): Dg3Tender {
  const source = isGccTenantKey(tenant) ? gccData(tenant).sources.find((s) => s.id === ev.portal) : undefined;
  return {
    value: { amount: l.value.amount, ccy: l.value.ccy },
    ...(l.submissionDeadline ? { deadline: l.submissionDeadline } : {}),
    portalName: source?.name ?? ev.portal,
    tzLabel: TENANTS.find((t) => t.key === tenant)?.tzLabel ?? '',
  };
}

export interface Dg3EvidenceVM extends Dg3Evaluation {
  /** The seed lifecycle it was read against: title, Bid Manager, deadline. */
  l: Lifecycle;
  evidence: Dg3Evidence;
  tender: Dg3Tender;
  facts: Dg3Seed['facts'];
  /** Compliance re-issued with the bank's extension (the demo control). */
  fixed: boolean;
  /** When Compliance first issued the pack: the round 1 clock starts here. */
  issuedAt: string;
}

/** One tender's DG3 evidence, with the demo's re-issue fix applied, or null when it has no DG3 pack. */
export function dg3EvidenceFor(tenant: string, tenderId: string, done: Done): Dg3EvidenceVM | null {
  const seed = dg3SeedOf(tenant, tenderId);
  if (!seed) return null;
  const fixed = reissuesOf(done, tenderId).some((r) => r.fixed === 'bond-validity');
  const b = seed.evidence.bond;
  const extendedTo = addDays(b.requiredTo, BANK_EXTENSION_DAYS);
  const evidence: Dg3Evidence = fixed
    ? { ...seed.evidence, bond: { ...b, validTo: extendedTo, note: `The bank extended it to ${dayText(extendedTo)} after DG3 sent the pack back` } }
    : seed.evidence;
  const tender = dg3TenderOf(tenant, seed.l, evidence);
  return { ...summarise(evaluateDg3(evidence, seed.facts, tender)), l: seed.l, evidence, tender, facts: seed.facts, fixed, issuedAt: seed.facts.dg3IssuedAt };
}

/* ------------------------------------------------------------ masking */

export interface Dg3LineVM extends Omit<Dg3Line, 'mask'> {
  /** Set when the viewer may not see the line's figure: `text` is then the part they may read, and this is the chip's words. */
  maskLabel?: string;
}

/** The lines as one viewer may read them (plan 018 step 1.4): pass or fail always shows; figures only with `see.margin`. */
export function linesFor(lines: Dg3Line[], viewer: { canSeeMargin: boolean }): Dg3LineVM[] {
  return lines.map(({ mask, ...l }) => (mask && !viewer.canSeeMargin ? { ...l, text: mask.visible, maskLabel: mask.label } : l));
}
