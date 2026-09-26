import type { Credential, CredentialKind, Criterion, Financials, GccTender, Partner, PqKind, PqRequirement, SimilarProject } from '@/data/gcc/types';
import { CRITERIA } from '@/data/gcc/types';
import { isCcy, type Ccy } from '@/data/gcc/fx';
import { s1Data, type KeyPerson, type S1Data } from '@/data/gcc/s1';
import { DEMO_TODAY, calendarDaysBetween, dateText } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import { DONE_KEY, isFlagged, readDone, type Done, type Stamped } from './done';
import {
  capitalise, countWord, countryAdjective, countryCodeOf, countryShort, dataOf, dayMonth, keyDate, listText, numberText, openingOf,
  plural, profileOf, roundMoney, shortDate, tenderOf,
} from './common';

/**
 * Eligibility: each PQ requirement checked against the company's credential
 * vault, projects, accounts and key people, on the date it must hold (spec
 * §6.5, plan 007a Phase 2). Plan 009a imports `eligibilityFor`; keep its name
 * and shape stable.
 */

// ---------------------------------------------------------------------------
// Types

export type LineState = 'pass' | 'at-risk' | 'interpretation' | 'fail' | 'na';
export type LineAction = 'request-renewal' | 'draft-query' | 'add-evidence' | 'find-partner';

export interface Evidence { kind: 'credential' | 'project' | 'financials' | 'person' | 'partner'; id: string; label: string }

export interface EligibilityLine {
  reqId: string;
  kind: PqKind;
  text: string;
  page: number;
  alsoOn?: number[];
  state: LineState;
  why: string;
  evidence: Evidence[];
  actions: LineAction[];
  checkedAgainst: { date: string; label: string };
  /** In a JV scenario: which member meets it. */
  satisfiedBy?: 'self' | 'partner' | 'both' | 'combined';
  /** Credentials behind an at-risk certificate line, for "Request renewal". */
  renew?: { credentialId: string; ownerId: string; label: string; validTo: string }[];
}

export interface JvScenario { partnerId: string; lead: 'partner' | 'self'; shares: [number, number] }

export interface EligibilityCounts { met: number; atRisk: number; interpretation: number; fail: number; na: number }

export interface EligibilityResult {
  tenderId: string;
  lines: EligibilityLine[];
  counts: EligibilityCounts;
  verdict: 'eligible' | 'eligible-with-jv' | 'not-eligible';
  jvPartner?: { id: string; name: string };
  /** The JV the check was run with, or the one that clears every fail when bidding alone does not. */
  jv?: JvScenario;
  /** True when these lines are the JV re-check (a scenario was passed). */
  asJv: boolean;
  /** Group entity bidding in its own name, e.g. Qurain Meridian Arabia Co. */
  entity?: { id: string; name: string };
  text: string;
  /** Earliest date the at-risk certificates must be renewed by. */
  renewBefore?: string;
  /** The tender's stored eligibility criterion score (0–10), for `eligibilityScore`. */
  storedScore: number;
  /**
   * Set when the check could not run as asked (a JV scenario naming a partner
   * the tenant does not have). The lines are then empty and `text` repeats it.
   */
  error?: string;
}

/** Written by the vault (plan 010) or presenter (014). */
export interface RenewedValue extends Stamped { validTo: string }

// ---------------------------------------------------------------------------
// Rules held as constants (they are the tender's rules, not demo numbers)

const CERTIFICATE_KINDS = new Set<PqKind>([
  'cr', 'zakat', 'gosi', 'chamber', 'classification', 'contractors-authority', 'saudization', 'vat', 'iso', 'engineers-council', 'avl',
]);

const KIND_NAME: Partial<Record<CredentialKind, string>> = {
  cr: 'Commercial Registration', zakat: 'Zakat certificate', gosi: 'GOSI certificate', chamber: 'Chamber of Commerce membership',
  classification: 'contractor classification', 'contractors-authority': 'Contractors Authority membership', saudization: 'Saudization certificate',
  vat: 'VAT registration', iso: 'ISO certificates', 'engineers-council': 'engineers council registration', avl: 'approved-vendor registration',
  'lc-baseline': 'local content baseline certificate',
};

/** PQ-13's four roles and thresholds, as the booklet prints them (Annex 4, p. 40). The text is not parsed. */
export const KEY_ROLES: { role: KeyPerson['role']; label: string; years: number; sectorYears?: number; saudi?: boolean; asked: string }[] = [
  { role: 'project-manager', label: 'Project Manager', years: 20, sectorYears: 10, asked: 'Project Manager (20 years, 10 in water and wastewater)' },
  { role: 'process-lead', label: 'Process Design Lead', years: 15, asked: 'Process Design Lead (15 years)' },
  { role: 'hse-manager', label: 'HSE Manager', years: 10, saudi: true, asked: 'Saudi national HSE Manager (10 years)' },
  { role: 'commissioning-manager', label: 'Commissioning Manager', years: 12, asked: 'Commissioning Manager (12 years)' },
];
export const KEY_ROLES_PAGE = 40;

/** Consortium turnover (PQ-11 jvRule): the lead ≥ 60% of the threshold, members combined ≥ 100%. */
const JV_LEAD_SHARE = 0.6;
/** The JV tried when bidding alone fails (plan 007a step 2.4). */
const DEFAULT_JV_SHARES: [number, number] = [60, 40];

const LIVE_STAGES = new Set<GccTender['stage']>(['S1', 'S2', 'S3', 'DG2']);

// ---------------------------------------------------------------------------
// Members: the bidder (or its group entity) and, in a JV, the partner

interface Member {
  role: 'self' | 'partner';
  id: string;
  name: string;
  credentials: Credential[];
  projects: SimilarProject[];
  financials: Financials[];
  /** Key people (the bidder only: the partner list holds none). */
  people: KeyPerson[];
}

/** `renewed:{id}` replaces the vault's expiry. */
const withRenewals = (creds: Credential[], done: Done): Credential[] =>
  creds.map((c) => {
    const r = readDone<RenewedValue>(done, DONE_KEY.renewed(c.id));
    return r?.validTo ? { ...c, validTo: r.validTo } : c;
  });

/**
 * The bidder. A group entity that bids in its own name in the tender's country
 * (Qurain Meridian Arabia Co. in KSA) is checked on its own credentials,
 * projects and accounts; group certificates with no country (ISO) count for it.
 */
function selfMember(tenant: string, t: GccTender, s1: S1Data, done: Done): Member {
  const d = dataOf(tenant);
  const cc = countryCodeOf(t.country);
  const entity = cc ? d.company.entities?.find((e) => e.country === cc) : undefined;
  if (entity) {
    return {
      role: 'self', id: entity.id, name: entity.name,
      credentials: withRenewals(d.credentials.filter((c) => c.holder === entity.id || (!c.holder && !c.country)), done),
      projects: d.projects.filter((p) => p.holder === entity.id),
      financials: entity.financials,
      people: s1.personnel.filter((p) => p.entity === entity.id),
    };
  }
  return {
    role: 'self', id: tenant, name: profileOf(tenant).name,
    credentials: withRenewals(d.credentials.filter((c) => !c.holder), done),
    projects: d.projects.filter((p) => !p.holder),
    financials: d.company.financials,
    people: s1.personnel.filter((p) => !p.entity),
  };
}

const partnerMember = (p: Partner, done: Done): Member => ({
  role: 'partner', id: p.id, name: p.name, credentials: withRenewals(p.credentials, done), projects: p.projects, financials: p.financials, people: [],
});

// ---------------------------------------------------------------------------
// Check date (step 2.2.1)

interface Check { date: string; name: string; short: string; label: string }

function checkFor(t: GccTender, r: PqRequirement): Check {
  const kd = r.validAt === 'validity'
    ? keyDate(t, 'validity-end') ?? openingOf(t)
    : r.validAt === 'submission' ? keyDate(t, 'submission') ?? openingOf(t) : openingOf(t);
  if (!kd) return { date: DEMO_TODAY, name: 'today', short: 'today', label: `today ${shortDate(DEMO_TODAY)}` };
  const [name, short] = kd.kind === 'opening' ? ['bid opening', 'opening'] : kd.kind === 'submission' ? ['submission', 'submission'] : ['the end of bid validity', 'the end of bid validity'];
  return { date: kd.date, name, short, label: `${name} ${shortDate(kd.date)}` };
}

// ---------------------------------------------------------------------------
// Line helpers

interface Ctx {
  tenant: string;
  t: GccTender;
  s1: S1Data;
  done: Done;
  members: Member[];
  jv?: JvScenario & { partner: Partner };
}

const isValidOn = (c: Credential, iso: string) => c.validTo === null || c.validTo >= iso;
const byLatestExpiry = (a: Credential, b: Credential) => (a.validTo === null ? -1 : b.validTo === null ? 1 : b.validTo.localeCompare(a.validTo));
const credEvidence = (c: Credential): Evidence => ({ kind: 'credential', id: c.id, label: c.label });
const validText = (c: Credential) => (c.validTo === null ? 'no expiry' : `valid to ${dateText(c.validTo)}`);
const credName = (c: Credential) => (c.kind === 'classification' && c.grade !== undefined ? `${c.label}, Grade ${c.grade}` : c.label);
const self = (ctx: Ctx) => ctx.members[0];
const partnerOf = (ctx: Ctx) => ctx.members.find((m) => m.role === 'partner');
const yearOf = (iso: string) => iso.slice(0, 4);
const addYears = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`;

const STATE_RANK: Record<LineState, number> = { fail: 4, 'at-risk': 3, interpretation: 2, pass: 1, na: 0 };
const worst = (states: LineState[]) => states.reduce<LineState>((w, s) => (STATE_RANK[s] > STATE_RANK[w] ? s : w), 'pass');

function base(r: PqRequirement, check: Check) {
  return {
    reqId: r.id, kind: r.kind, text: r.text, page: r.page, ...(r.alsoOn ? { alsoOn: r.alsoOn } : {}),
    checkedAgainst: { date: check.date, label: check.label },
  };
}

const hasQuery = (ctx: Ctx, reqId: string) => ctx.s1.queries.some((q) => q.tenderId === ctx.t.id && q.relatesTo === reqId);

// ---------------------------------------------------------------------------
// Certificates (step 2.2.2)

interface CertEval { state: 'pass' | 'at-risk' | 'fail'; cred?: Credential; why: string }

function evalCert(m: Member, r: PqRequirement, check: Check, done: Done): CertEval {
  const field = r.threshold?.field;
  const grade = r.threshold?.grade;
  const ofKind = m.credentials.filter((c) => c.kind === r.kind);
  const inCountry = ofKind.filter((c) => !r.country || c.country === r.country);
  const inField = inCountry.filter((c) => !field || c.field === field);
  const atGrade = inField.filter((c) => !grade || (c.grade !== undefined && c.grade <= grade));

  const pass = atGrade.filter((c) => isValidOn(c, check.date)).sort(byLatestExpiry)[0];
  if (pass) return { state: 'pass', cred: pass, why: `${credName(pass)}: ${validText(pass)}` };

  const risk = atGrade.filter((c) => isValidOn(c, DEMO_TODAY)).sort(byLatestExpiry)[0];
  if (risk && risk.validTo) {
    const days = calendarDaysBetween(risk.validTo, check.date);
    const requested = isFlagged(done, DONE_KEY.renewalRequested(risk.id)) ? ' Renewal requested.' : '';
    return {
      state: 'at-risk', cred: risk,
      why: `${risk.label} expires ${dateText(risk.validTo)}, ${plural(days, 'day')} before ${check.name} (${shortDate(check.date)}). Renew before submission.${requested}`,
    };
  }

  const name = KIND_NAME[r.kind as CredentialKind] ?? r.kind;
  const adj = r.country ? `${countryAdjective(r.country)} ` : '';
  const expired = atGrade.sort(byLatestExpiry)[0];
  if (expired?.validTo) return { state: 'fail', cred: expired, why: `${expired.label} expired on ${dateText(expired.validTo)}. Renew before submission.` };
  if (inField.length && grade) {
    const best = Math.min(...inField.map((c) => c.grade ?? Infinity));
    return { state: 'fail', why: `Classified ${field}, Grade ${best}; Grade ${grade} required` };
  }
  if (inCountry.length && field) {
    return { state: 'fail', why: `${capitalise(adj)}${name} held for ${listText([...new Set(inCountry.map((c) => c.field ?? 'another activity'))])}; ${field} required` };
  }
  if (ofKind.length && r.country) {
    const where = listText([...new Set(ofKind.map((c) => (c.country ? countryShort(c.country) : 'another country')))]);
    return { state: 'fail', why: `${capitalise(name)} held in ${where} only; a ${countryAdjective(r.country)} one is required` };
  }
  return { state: 'fail', why: `No ${adj}${name} on record` };
}

function certLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  if (r.kind === 'classification' && ctx.jv) return classificationJvLine(r, check, ctx);
  const evals = ctx.members.map((m) => ({ m, e: evalCert(m, r, check, ctx.done) }));
  const state = worst(evals.map((x) => x.e.state));
  const evidence = evals.flatMap((x) => (x.e.cred ? [credEvidence(x.e.cred)] : []));
  const renew = evals.flatMap((x) => (x.e.state === 'at-risk' && x.e.cred?.validTo
    ? [{ credentialId: x.e.cred.id, ownerId: x.e.cred.ownerId, label: x.e.cred.label, validTo: x.e.cred.validTo }] : []));
  const actions: LineAction[] = state === 'at-risk' ? ['request-renewal', 'add-evidence'] : state === 'fail' ? ['add-evidence'] : [];

  let why: string;
  if (!ctx.jv) why = evals[0].e.why;
  else if (state === 'pass') why = `Pass (both): each member holds its own. ${evals.map((x) => `${x.m.name}: ${validText(x.e.cred!)}`).join('; ')}`;
  else {
    const bad = evals.filter((x) => x.e.state === state);
    why = `${bad.map((x) => `${x.m.name}: ${x.e.why}`).join(' ')}${state === 'fail' ? ' Each member must hold its own.' : ''}`;
  }
  return { ...base(r, check), state, why, evidence, actions, ...(renew.length ? { renew } : {}), ...(ctx.jv && state === 'pass' ? { satisfiedBy: 'both' as const } : {}) };
}

/** Classification Law Art. 9: every member in the field; one at the grade; the others at most one grade lower. */
function classificationJvLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const field = r.threshold?.field;
  const grade = r.threshold?.grade ?? 1;
  const bestOf = (m: Member) => m.credentials
    .filter((c) => c.kind === 'classification' && (!r.country || c.country === r.country) && (!field || c.field === field) && isValidOn(c, DEMO_TODAY))
    .sort((a, b) => (a.grade ?? 99) - (b.grade ?? 99))[0];
  const best = ctx.members.map((m) => ({ m, c: bestOf(m) }));
  const evidence = best.flatMap((x) => (x.c ? [credEvidence(x.c)] : []));
  const gradeText = (x: { m: Member; c?: Credential }) => `${x.m.name} ${x.c ? `Grade ${x.c.grade}` : 'not classified'}`;
  const missing = best.filter((x) => !x.c);
  const atGrade = best.filter((x) => x.c && (x.c.grade ?? 99) <= grade);
  const tooLow = best.filter((x) => x.c && (x.c.grade ?? 99) > grade + 1);

  if (missing.length || !atGrade.length || tooLow.length) {
    const reason = missing.length ? `${listText(missing.map((x) => x.m.name))} not classified in ${field}` : !atGrade.length ? `no member at Grade ${grade}` : `${listText(tooLow.map(gradeText))}: more than one grade lower`;
    return { ...base(r, check), state: 'fail', why: `Fail (Classification Law Art. 9): ${reason}`, evidence, actions: ['find-partner'] };
  }
  const expiring = best.filter((x) => x.c && !isValidOn(x.c, check.date));
  const who = atGrade.length === best.length ? 'both' : atGrade[0].m.role;
  const rest = best.filter((x) => !atGrade.includes(x));
  const detail = `${listText(atGrade.map(gradeText))}${rest.length ? `; ${listText(rest.map(gradeText))}, within one grade` : ''} (Classification Law Art. 9)`;
  if (expiring.length) {
    return { ...base(r, check), state: 'at-risk', why: `${detail}. ${listText(expiring.map((x) => `${x.m.name}'s certificate expires ${dateText(x.c!.validTo!)}`))}, before ${check.name}.`,
      evidence, actions: ['request-renewal', 'add-evidence'] };
  }
  return { ...base(r, check), state: 'pass', why: `Pass (${who}): ${detail}`, evidence, actions: [], satisfiedBy: who };
}

// ---------------------------------------------------------------------------
// Experience (step 2.2.4)

interface Qualifying { m: Member; p: SimilarProject; measure: number }

function qualifying(r: PqRequirement, check: Check, ctx: Ctx): Qualifying[] {
  const th = r.threshold ?? {};
  const from = addYears(check.date, -(th.years ?? 10));
  const perM3 = !th.unit || th.unit === 'm3/day';
  const scope = ctx.s1.scopes.find((s) => s.tenderId === ctx.t.id && s.reqId === r.id);
  const out: Qualifying[] = [];
  for (const m of ctx.members) {
    for (const p of m.projects) {
      if (p.role !== 'prime' && p.role !== 'jv-lead') continue;
      if (p.completed < from || p.completed > check.date) continue;
      let measure: number | undefined;
      if (perM3) measure = p.capacityM3d;
      else if (scope) {
        const len = ctx.s1.lengths.find((l) => l.projectId === p.id && scope.kinds.includes(l.kind) && (!scope.minDiameterMm || (l.diameterMm ?? 0) >= scope.minDiameterMm));
        measure = len?.km;
      }
      if (measure !== undefined && measure >= (th.value ?? 0)) out.push({ m, p, measure });
    }
  }
  return out.sort((a, b) => b.measure - a.measure);
}

function experienceLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const th = r.threshold ?? {};
  const count = th.count ?? 1;
  const perM3 = !th.unit || th.unit === 'm3/day';
  const unitText = perM3 ? 'm³/day' : (th.unit ?? '');
  const noun = perM3 ? (count === 1 ? 'STP' : 'STPs') : (count === 1 ? 'contract' : 'contracts');
  const needTertiary = /at least one with tertiary treatment/i.test(r.note ?? '');
  const measureText = (q: Qualifying) => (perM3 ? `${numberText(q.measure)} m³/day` : `${numberText(q.measure)} ${th.unit}`);
  const long = (q: Qualifying) => `${q.p.title} (${measureText(q)}${q.p.tertiary ? ', tertiary' : ''}, ${yearOf(q.p.completed)})`;
  const short = (q: Qualifying) => `${measureText(q)}${q.p.tertiary ? ', tertiary' : ''}, ${yearOf(q.p.completed)}`;
  const meets = (qs: Qualifying[]) => qs.length >= count && (!needTertiary || qs.some((q) => q.p.tertiary));

  const qs = qualifying(r, check, ctx);
  const evidence: Evidence[] = qs.map((q) => ({ kind: 'project', id: q.p.id, label: q.p.title }));
  const asked = `${capitalise(countWord(count))} completed ${noun} ≥ ${numberText(th.value ?? 0)} ${unitText} in ${th.years ?? 10} years`;

  if (meets(qs)) {
    if (!ctx.jv) return { ...base(r, check), state: 'pass', why: `${qs.length} on record: ${qs.map(long).join(', ')}`, evidence, actions: [] };
    const partner = partnerOf(ctx)!;
    const ofP = qs.filter((q) => q.m.role === 'partner');
    const ofS = qs.filter((q) => q.m.role === 'self');
    const [who, pool] = meets(ofP) ? ['partner' as const, ofP] : meets(ofS) ? ['self' as const, ofS] : ['combined' as const, qs];
    const by = who === 'partner' ? partner.name : who === 'self' ? self(ctx).name : 'members together';
    return {
      ...base(r, check), state: 'pass', satisfiedBy: who, evidence, actions: [],
      why: `Pass (${who}): ${by}, ${pool.length} ${perM3 ? (pool.length === 1 ? 'STP' : 'STPs') : 'contracts'} ≥ ${numberText(th.value ?? 0)} ${unitText}`,
    };
  }
  const noTertiary = qs.length >= count && needTertiary ? ', none with tertiary treatment' : '';
  const listed = qs.length ? ` (${qs.map(short).join('; ')})` : '';
  const where = ctx.jv ? ' across the JV members' : '';
  return {
    ...base(r, check), state: 'fail', evidence, actions: ['find-partner', 'add-evidence'],
    why: `${asked}: ${qs.length} on record${where}${listed}${noTertiary}.${ctx.jv ? '' : ' JV partner needed.'}`,
  };
}

// ---------------------------------------------------------------------------
// O&M (step 2.2.5)

function omLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const th = r.threshold ?? {};
  const need = th.years ?? 3;
  const hits = ctx.members.flatMap((m) => m.projects
    .filter((p) => p.om && (p.capacityM3d ?? 0) >= (th.value ?? 0))
    .map((p) => ({ m, p, years: (calendarDaysBetween(p.om!.from, p.om!.to) + 1) / 365.25 })))
    .filter((x) => x.years >= need)
    .sort((a, b) => b.years - a.years);
  if (!hits.length) {
    return {
      ...base(r, check), state: 'fail', evidence: [], actions: ['find-partner'],
      why: `No record of ${need} years or more of O&M on an STP of ${numberText(th.value ?? 0)} m³/day or more. A named O&M subcontractor or a JV partner can meet it.`,
    };
  }
  const h = hits.find((x) => x.m.role === 'self') ?? hits[0];
  const what = `${h.p.title}: ${Math.round(h.years)} years of O&M (${yearOf(h.p.om!.from)}–${yearOf(h.p.om!.to)}) on a ${numberText(h.p.capacityM3d ?? 0)} m³/day plant`;
  const who = h.m.role;
  return {
    ...base(r, check), state: 'pass', evidence: [{ kind: 'project', id: h.p.id, label: h.p.title }], actions: [],
    why: ctx.jv ? `Pass (${who}): ${h.m.name}, ${what}` : what, ...(ctx.jv ? { satisfiedBy: who } : {}),
  };
}

// ---------------------------------------------------------------------------
// Turnover (step 2.2.6)

interface Reading { years: Financials[]; avg: number; label: string }

function reading(years: Financials[], ccy: Ccy): Reading {
  const sorted = [...years].sort((a, b) => a.fy - b.fy);
  const avg = sorted.reduce((s, f) => s + convert(f.turnover.amount, f.turnover.ccy, ccy), 0) / sorted.length;
  const label = sorted.length > 1 ? `FY${sorted[0].fy}–FY${sorted[sorted.length - 1].fy}` : `FY${sorted[0].fy}`;
  return { years: sorted, avg, label };
}

/** The last N audited years, and the N ending with a year audited after today but by the check date. */
function readings(m: Member, n: number, check: Check, ccy: Ccy): { audited: Reading | null; pending?: { fy: Financials; reading: Reading } } {
  const audited = m.financials.filter((f) => f.audited).sort((a, b) => b.fy - a.fy).slice(0, n);
  if (audited.length < n) return { audited: null };
  const pending = m.financials
    .filter((f) => !f.audited && f.auditDate && f.auditDate > DEMO_TODAY && f.auditDate <= check.date)
    .sort((a, b) => b.fy - a.fy)[0];
  return {
    audited: reading(audited, ccy),
    ...(pending ? { pending: { fy: pending, reading: reading([pending, ...audited.slice(0, n - 1)], ccy) } } : {}),
  };
}

const finEvidence = (m: Member, r: Reading): Evidence[] =>
  r.years.map((f) => ({ kind: 'financials', id: `${m.id}-fy${f.fy}`, label: `FY${f.fy} ${f.audited ? 'audited' : 'draft'} accounts` }));

/** An amount that rounds to the same text as the threshold it misses gets a third decimal: "SAR 1.198 bn". */
const apart = (amount: number, thr: number, ccy: Ccy) =>
  amount !== thr && money(amount, ccy) === money(thr, ccy) ? money(amount, ccy, { dp: 3 }) : money(amount, ccy);

/** "SAR 844.8 M (QAR 820.0 M)" when the accounts are in another currency. */
function avgText(r: Reading, ccy: Ccy, thr: number): string {
  const own = r.years[0].turnover.ccy;
  if (own === ccy) return apart(r.avg, thr, ccy);
  const ownAvg = r.years.reduce((s, f) => s + f.turnover.amount, 0) / r.years.length;
  return `${apart(r.avg, thr, ccy)} (${money(ownAvg, own)})`;
}

function turnoverLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const th = r.threshold ?? {};
  const n = th.years ?? 3;
  const ccy: Ccy = th.unit && isCcy(th.unit) ? th.unit : 'SAR';
  const thr = th.value ?? 0;
  const thrText = roundMoney(thr, ccy);
  if (ctx.jv) return turnoverJvLine(r, check, ctx, n, ccy, thr);

  const m = self(ctx);
  const { audited, pending } = readings(m, n, check, ccy);
  if (!audited) {
    return { ...base(r, check), state: 'fail', evidence: [], actions: ['add-evidence'], why: `Fewer than ${countWord(n)} years of audited accounts on record` };
  }
  const passA = audited.avg >= thr;
  if (pending) {
    const b = pending.reading;
    const passB = b.avg >= thr;
    const evidence = [...finEvidence(m, audited), ...finEvidence(m, b)].filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
    const head = `'Average turnover of the last ${countWord(n)} financial years'. FY${pending.fy.fy} accounts are due to be audited on ${dayMonth(pending.fy.auditDate!)}, before ${check.short}. `
      + `${audited.label} gives an average of ${avgText(audited, ccy, thr)}; ${b.label} gives ${avgText(b, ccy, thr)}.`;
    const query = hasQuery(ctx, r.id) ? ' Suggested query to the employer drafted.' : '';
    if (passA && passB) {
      return { ...base(r, check), state: 'interpretation', evidence, actions: ['draft-query'], why: `${head} Both pass the ${thrText} threshold.${query}` };
    }
    if (passA || passB) {
      return {
        ...base(r, check), state: 'interpretation', evidence, actions: ['draft-query'],
        why: `${head} Only ${passA ? audited.label : b.label} passes the ${thrText} threshold: the result depends on the reading.${query}`,
      };
    }
    return {
      ...base(r, check), state: 'fail', evidence, actions: ['find-partner'],
      why: `Average turnover ${audited.label}: ${avgText(audited, ccy, thr)}; ${b.label}: ${avgText(b, ccy, thr)}. Both are below the ${thrText} threshold.`,
    };
  }
  return {
    ...base(r, check), state: passA ? 'pass' : 'fail', evidence: finEvidence(m, audited), actions: passA ? [] : ['find-partner'],
    why: `Average turnover ${audited.label} (audited): ${avgText(audited, ccy, thr)}, ${passA ? 'meets' : 'below'} the ${thrText} threshold`,
  };
}

function turnoverJvLine(r: PqRequirement, check: Check, ctx: Ctx, n: number, ccy: Ccy, thr: number): EligibilityLine {
  const lead = ctx.jv!.lead === 'partner' ? partnerOf(ctx)! : self(ctx);
  const avgs = ctx.members.map((m) => ({ m, r: readings(m, n, check, ccy).audited }));
  const leadAvg = avgs.find((x) => x.m === lead)?.r?.avg ?? 0;
  const combined = avgs.reduce((s, x) => s + (x.r?.avg ?? 0), 0);
  const evidence = avgs.flatMap((x) => (x.r ? finEvidence(x.m, x.r) : []));
  const leadOk = leadAvg >= JV_LEAD_SHARE * thr;
  const allOk = combined >= thr;
  const pct = `${Math.round(JV_LEAD_SHARE * 100)}%`;
  if (leadOk && allOk) {
    return { ...base(r, check), state: 'pass', satisfiedBy: 'combined', evidence, actions: [],
      why: `Pass: lead ${lead.name} ${money(leadAvg, ccy)} ≥ ${pct}; combined ${money(combined, ccy)}` };
  }
  const gaps = [
    ...(leadOk ? [] : [`lead ${lead.name} ${money(leadAvg, ccy)} is below ${pct} of ${roundMoney(thr, ccy)}`]),
    ...(allOk ? [] : [`combined ${money(combined, ccy)} is below ${roundMoney(thr, ccy)}`]),
  ];
  return { ...base(r, check), state: 'fail', evidence, actions: ['find-partner'], why: `Fail: ${gaps.join('; ')}` };
}

// ---------------------------------------------------------------------------
// Ratios (step 2.2.7)

function ratiosLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const min = r.threshold?.value ?? 0;
  const evals = ctx.members.map((m) => {
    const f = m.financials.filter((x) => x.audited && x.netWorth && x.currentRatio !== undefined).sort((a, b) => b.fy - a.fy)[0];
    const ok = !!f && f.netWorth!.amount > 0 && f.currentRatio! >= min;
    const text = f
      ? `FY${f.fy} audited accounts: net worth ${money(f.netWorth!.amount, f.netWorth!.ccy)}, current ratio ${f.currentRatio}`
      : 'no audited net worth and current ratio on record';
    return { m, f, ok, text };
  });
  const ok = evals.every((e) => e.ok);
  const evidence = evals.flatMap((e) => (e.f ? [{ kind: 'financials' as const, id: `${e.m.id}-fy${e.f.fy}`, label: `FY${e.f.fy} audited accounts` }] : []));
  const why = ctx.jv ? evals.map((e) => `${e.m.name}: ${e.text}`).join('; ') : evals[0].text;
  return {
    ...base(r, check), state: ok ? 'pass' : 'fail', evidence, actions: ok ? [] : ['add-evidence'],
    why: ok ? `${why} (at least ${min})` : `${why}; positive net worth and a current ratio of ${min} or more required`,
    ...(ctx.jv && ok ? { satisfiedBy: 'both' as const } : {}),
  };
}

// ---------------------------------------------------------------------------
// Key personnel (step 2.2.8)

function personnelLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const people = self(ctx).people;
  const found = KEY_ROLES.map((k) => ({
    k,
    p: people
      .filter((p) => p.role === k.role && p.years >= k.years && (!k.sectorYears || p.sectorYears >= k.sectorYears) && (!k.saudi || p.saudiNational))
      .sort((a, b) => b.years - a.years)[0],
  }));
  const missing = found.filter((x) => !x.p);
  const evidence: Evidence[] = found.flatMap((x) => (x.p ? [{ kind: 'person' as const, id: x.p.id, label: `${x.p.name}, ${x.p.title}` }] : []));
  if (missing.length) {
    return { ...base(r, check), state: 'fail', evidence, actions: ['add-evidence'], why: `Missing: ${listText(missing.map((x) => x.k.asked))}` };
  }
  const who = found.map(({ k, p }) => `${p!.name}, ${k.label} (${k.saudi ? 'Saudi national, ' : ''}${p!.years} years${k.sectorYears ? `, ${p!.sectorYears} in water` : ''})`);
  return { ...base(r, check), state: 'pass', evidence, actions: [], why: `All four roles on record (p. ${KEY_ROLES_PAGE}): ${who.join('; ')}` };
}

// ---------------------------------------------------------------------------
// Local content (step 2.2.9)

function lcLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  const min = r.threshold?.value ?? 0;
  const commitment = 'A target LC% commitment must be stated in the bid (§51-4)';
  // A local content certificate counts only in the country that issued it: the tender's, unless the requirement names one.
  const cc = r.country ?? countryCodeOf(ctx.t.country);
  const evals = ctx.members.map((m) => {
    const all = m.credentials.filter((c) => c.kind === 'lc-baseline');
    const certs = all.filter((c) => !cc || c.country === cc).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const elsewhere = all.filter((c) => !certs.includes(c));
    const ok = certs.find((c) => (c.score ?? 0) >= min && isValidOn(c, check.date));
    const risk = !ok ? certs.find((c) => (c.score ?? 0) >= min && isValidOn(c, DEMO_TODAY)) : undefined;
    const best = ok ?? risk ?? certs[0];
    const state: LineState = ok ? 'pass' : risk ? 'at-risk' : 'fail';
    const text = !best
      ? elsewhere.length && cc
        ? `${listText(elsewhere.map((c) => `${c.label} (${c.country ? countryAdjective(c.country) : 'no country'})`))} ${elsewhere.length === 1 ? 'does' : 'do'} not count in ${countryShort(cc)}; a ${countryAdjective(cc)} local content baseline certificate is required`
        : `No ${cc ? `${countryAdjective(cc)} ` : ''}local content baseline certificate on record`
      : state === 'at-risk' ? `${best.label}: ${best.score}%, but it expires ${dateText(best.validTo!)}, before ${check.name}`
      : `${best.label}: ${best.score}%, ${state === 'pass' ? 'above' : 'below'} the ${min}% minimum`;
    return { m, best, state, text };
  });
  const state = worst(evals.map((e) => e.state));
  const evidence = evals.flatMap((e) => (e.best ? [credEvidence(e.best)] : []));
  const body = ctx.jv ? evals.map((e) => `${e.m.name}: ${e.text}`).join('; ') : evals[0].text;
  return {
    ...base(r, check), state, evidence, actions: state === 'pass' ? [] : state === 'at-risk' ? ['request-renewal', 'add-evidence'] : ['add-evidence'],
    why: `${body}. ${commitment}`, ...(ctx.jv && state === 'pass' ? { satisfiedBy: 'both' as const } : {}),
  };
}

// ---------------------------------------------------------------------------
// Consortium (step 2.2.10)

function consortiumLine(r: PqRequirement, check: Check, ctx: Ctx): EligibilityLine {
  if (!ctx.jv) return { ...base(r, check), state: 'na', evidence: [], actions: [], why: 'Applies only when bidding as a consortium' };
  const sub = keyDate(ctx.t, 'submission');
  return {
    ...base(r, check), state: 'at-risk', actions: ['add-evidence'],
    evidence: [{ kind: 'partner', id: ctx.jv.partner.id, label: ctx.jv.partner.name }],
    why: `Consortium agreement to be certified by the Chamber of Commerce or a notary before ${sub ? shortDate(sub.date) : 'submission'}`,
  };
}

// ---------------------------------------------------------------------------
// One line per requirement

function lineFor(r: PqRequirement, ctx: Ctx): EligibilityLine {
  const check = checkFor(ctx.t, r);
  if (CERTIFICATE_KINDS.has(r.kind)) return certLine(r, check, ctx);
  switch (r.kind) {
    case 'experience': return experienceLine(r, check, ctx);
    case 'om': return omLine(r, check, ctx);
    case 'turnover': return turnoverLine(r, check, ctx);
    case 'ratios': return ratiosLine(r, check, ctx);
    case 'personnel': return personnelLine(r, check, ctx);
    case 'lc': return lcLine(r, check, ctx);
    case 'consortium': return consortiumLine(r, check, ctx);
    default:
      return { ...base(r, check), state: 'na', evidence: [], actions: [], why: 'Not assessed automatically: check by hand' };
  }
}

function countsOf(lines: EligibilityLine[]): EligibilityCounts {
  const n = (s: LineState) => lines.filter((l) => l.state === s).length;
  return { met: n('pass') + n('na'), atRisk: n('at-risk'), interpretation: n('interpretation'), fail: n('fail'), na: n('na') };
}

function linesFor(tenant: string, t: GccTender, done: Done, jv?: JvScenario & { partner: Partner }) {
  const s1 = s1Data(tenant);
  const me = selfMember(tenant, t, s1, done);
  const ctx: Ctx = { tenant, t, s1, done, members: jv ? [me, partnerMember(jv.partner, done)] : [me], jv };
  const lines = (t.requirements ?? []).map((r) => lineFor(r, ctx));
  if (me.id !== tenant) for (const l of lines) if (l.state !== 'na') l.why = `${me.name}: ${l.why}`;
  return { lines, me };
}

const countsText = (c: EligibilityCounts) => `${c.met} met · ${c.atRisk} at risk · ${c.interpretation} interpretation · ${c.fail} fail`;

function renewSuffix(lines: EligibilityLine[]): { text: string; before?: string } {
  const risky = lines.filter((l) => l.state === 'at-risk' && l.renew?.length);
  if (!risky.length) return { text: '' };
  const before = risky.map((l) => l.checkedAgainst.date).sort()[0];
  const n = risky.length;
  return { text: `; renew ${countWord(n)} certificate${n === 1 ? '' : 's'} before ${dayMonth(before)}`, before };
}

// ---------------------------------------------------------------------------
// Public API

/**
 * The PQ check for one tender in one tenant (spec §6.5). With a `scenario`, the
 * lines are re-run as that JV. Without one, a failing bidder is re-checked
 * with each partner on its list as lead (60/40); the first that clears every
 * fail makes it "eligible only with a JV partner". Null when the tender has no
 * extracted requirements.
 */
export function eligibilityFor(tenant: string, tenderId: string, done: Done, scenario?: JvScenario): EligibilityResult | null {
  const t = tenderOf(tenant, tenderId);
  if (!t || !t.requirements?.length) return null;
  const d = dataOf(tenant);
  const storedScore = t.fit.eligibility.score;

  if (scenario) {
    const partner = d.partners.find((p) => p.id === scenario.partnerId);
    if (!partner) {
      // Never fall back to bidding alone: the caller asked about a JV and would read the wrong answer.
      const error = `No partner "${scenario.partnerId}" on ${profileOf(tenant).name}'s partner list: the JV scenario was not checked`;
      return {
        tenderId, lines: [], counts: { met: 0, atRisk: 0, interpretation: 0, fail: 0, na: 0 }, asJv: true, jv: scenario, storedScore,
        verdict: 'not-eligible', text: error, error,
      };
    }
    const { lines, me } = linesFor(tenant, t, done, { ...scenario, partner });
    const counts = countsOf(lines);
    const ok = counts.fail === 0;
    const how = scenario.lead === 'partner'
      ? `a JV with ${partner.name} as lead (${scenario.shares[0]}/${scenario.shares[1]})`
      : `a JV led by ${me.name}, with ${partner.name} (${scenario.shares[0]}/${scenario.shares[1]})`;
    return {
      tenderId, lines, counts, asJv: true, jv: scenario, jvPartner: { id: partner.id, name: partner.name }, storedScore,
      verdict: ok ? 'eligible-with-jv' : 'not-eligible',
      ...(me.id !== tenant ? { entity: { id: me.id, name: me.name } } : {}),
      text: `${countsText(counts)} → ${ok ? `eligible as ${how}` : `not eligible as ${how}`}`,
    };
  }

  const { lines, me } = linesFor(tenant, t, done);
  const counts = countsOf(lines);
  const entity = me.id !== tenant ? { entity: { id: me.id, name: me.name } } : {};
  if (counts.fail === 0) {
    const renew = renewSuffix(lines);
    return {
      tenderId, lines, counts, asJv: false, verdict: 'eligible', storedScore, ...entity,
      text: `${countsText(counts)} → eligible${renew.text}`, ...(renew.before ? { renewBefore: renew.before } : {}),
    };
  }
  for (const partner of d.partners) {
    const jv: JvScenario = { partnerId: partner.id, lead: 'partner', shares: DEFAULT_JV_SHARES };
    const trial = linesFor(tenant, t, done, { ...jv, partner });
    if (countsOf(trial.lines).fail === 0) {
      return {
        tenderId, lines, counts, asJv: false, verdict: 'eligible-with-jv', jv, jvPartner: { id: partner.id, name: partner.name }, storedScore, ...entity,
        text: `fails ${plural(counts.fail, 'line')} alone → eligible only with a JV partner (${partner.name})`,
      };
    }
  }
  return { tenderId, lines, counts, asJv: false, verdict: 'not-eligible', storedScore, ...entity, text: `fails ${plural(counts.fail, 'line')} → not eligible` };
}

/** The eligibility criterion's 0–10 input: f(r) = no fail → max(6, 10 − at risk); JV needed → 5; else 2. */
export function eligibilityFactor(r: EligibilityResult): number {
  if (r.counts.fail === 0) return Math.max(6, 10 - r.counts.atRisk);
  return r.verdict === 'eligible-with-jv' ? 5 : 2;
}

/**
 * The fit model's eligibility score: the stored score, moved by how far the
 * live check has moved from the seed check (plan 007a step 2.5), clamped 0–10.
 */
export function eligibilityScore(result: EligibilityResult, seedResult: EligibilityResult): number {
  const s = result.storedScore + eligibilityFactor(result) - eligibilityFactor(seedResult);
  return Math.max(0, Math.min(10, s));
}

/**
 * The nine fit inputs as they stand: the stored scores, with the eligibility
 * criterion replaced by `eligibilityScore()` for tenders with requirements.
 */
export function fitScoresFor(tenant: string, tenderId: string, done: Done): { scores: Record<Criterion, number>; eligibility: EligibilityResult | null } | null {
  const t = tenderOf(tenant, tenderId);
  if (!t) return null;
  const scores = Object.fromEntries(CRITERIA.map((c) => [c, t.fit[c].score])) as Record<Criterion, number>;
  const eligibility = eligibilityFor(tenant, tenderId, done);
  if (eligibility) {
    const seed = eligibilityFor(tenant, tenderId, {})!;
    scores.eligibility = eligibilityScore(eligibility, seed);
  }
  return { scores, eligibility };
}

export interface EligibilityRisk { tenderId: string; title: string; shortTitle: string; stage: GccTender['stage']; fail: number; atRisk: number; lines: EligibilityLine[] }

/** Live Stage 1–3 tenders with any fail or at-risk line (SCR-5). */
export function eligibilityRisks(tenant: string, done: Done): EligibilityRisk[] {
  return dataOf(tenant).register
    .filter((t) => LIVE_STAGES.has(t.stage) && t.requirements?.length)
    .flatMap((t) => {
      const r = eligibilityFor(tenant, t.id, done);
      if (!r || r.counts.fail + r.counts.atRisk === 0) return [];
      return [{ tenderId: t.id, title: t.title, shortTitle: t.shortTitle, stage: t.stage, fail: r.counts.fail, atRisk: r.counts.atRisk,
        lines: r.lines.filter((l) => l.state === 'fail' || l.state === 'at-risk') }];
    });
}

/** Human names of what the failing lines ask for: "KSA registrations, classification and turnover". */
export function failKindsText(lines: EligibilityLine[], country?: string): string {
  const names: string[] = [];
  const add = (s: string) => { if (!names.includes(s)) names.push(s); };
  for (const l of lines.filter((x) => x.state === 'fail')) {
    if (l.kind === 'classification') add('classification');
    else if (l.kind === 'iso') add('ISO certificates');
    else if (CERTIFICATE_KINDS.has(l.kind)) add(country ? `${countryShort(country)} registrations` : 'registrations');
    else add(({ experience: 'experience', om: 'O&M', turnover: 'turnover', ratios: 'financial ratios', personnel: 'key personnel', lc: 'local content' } as Record<string, string>)[l.kind] ?? l.kind);
  }
  return listText(names);
}
