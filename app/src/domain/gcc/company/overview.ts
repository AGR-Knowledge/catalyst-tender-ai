import type { Person } from '@/data/people';
import type { CredentialKind, SimilarProject } from '@/data/gcc/types';
import type { Tone } from '@/data/types';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { convert } from '@/domain/money';
import type { MoneyVM } from '../viewmodels';
import { queriesFor } from '../lifecycle.port';
import { eligibilityFor, type EligibilityLine, type LineState } from '../s1/eligibility';
import { CAPACITY_WINDOW_DAYS, peakMonth } from '../s1/triage';
import type { Done } from '../s1/done';
import { dataOf, dayMonth, dayMonthYear, profileOf } from '../s1/common';
import { CREDENTIAL_STATE, KIND_LABEL, rowsText, type CredentialState, type Vault } from './vault';
import { PROJECT_ROLE, facilityFor, inCcy, profileFor, teamsFor, type ProfileVM, type ProjectVM } from './index';
import { bidSummaryFor, type BidSummaryVM } from './record';

/**
 * Company profile › Overview (plan 027c): the company as a bidder, composed
 * from what the other tabs already read. The identity and registrations (the
 * vault), the key figures (accounts, project register, vault, facility, team
 * load), turnover by year, the project record, the bid record's last 12
 * months (plan 032, `record.ts`), and where the eligibility checks use the
 * profile on the viewer's live tenders. No figure is new, and nothing here
 * writes.
 */

/** The credential kinds that register the company to bid, in the order they read. */
const REGISTRATION_KINDS: CredentialKind[] = ['cr', 'classification', 'contractors-authority', 'chamber', 'engineers-council'];

export interface RegistrationVM {
  id: string;
  label: string;
  kind: string;
  issuer: string;
  holder?: string;
  state: CredentialState;
  /** "Valid to 31 Dec 2026", "At risk, valid to 30 Apr 2026", "Expired 30 Apr 2026", "No expiry". */
  pill: { label: string; tone: Tone; icon: string };
}

export interface KeyFiguresVM {
  turnover: { fy: number; value: MoneyVM; audited: boolean; auditDate?: string; previous?: { fy: number; value: MoneyVM } } | null;
  netWorth: { fy: number; value: MoneyVM; audited: boolean; currentRatio?: number } | null;
  projects: { count: number; firstYear?: string; lastYear?: string; largest?: { id: string; title: string; value: MoneyVM } };
  credentials: { held: number; atRisk: number; expired: number; valid: number; next?: { id: string; text: string; validTo: string } };
  facility: { headroom: MoneyVM; limit: MoneyVM; usedPct: number; asOf: string };
  /** The busiest team over the next four weeks (CAP-1's reading), and its committed peak month. */
  load: { team: string; pct: number; windowLabel: string; weeks: number; peak: { pct: number; month: string } } | null;
}

export interface TurnoverBarVM {
  fy: number;
  value: MoneyVM;
  audited: boolean;
  auditDate?: string;
  /** Height against the largest year, 0–100. */
  pct: number;
  netWorth?: MoneyVM;
  currentRatio?: number;
}

export interface RecordRowVM { key: string; label: string; count: number; value: MoneyVM; pct: number }

export interface RecordVM {
  total: number;
  byCountry: RecordRowVM[];
  /** Every role, in the register's order, zeros included, so "all as prime" reads as such. */
  byRole: RecordRowVM[];
  recent: ProjectVM[];
}

export interface GapVM {
  tenderId: string;
  shortTitle: string;
  state: LineState;
  /** "Zakat certificate must hold to 10 May", or the requirement it does not meet. */
  text: string;
  /** Other gap lines on the same tender. */
  more: number;
}

export interface UsageVM {
  /** Live tenders the viewer can open that carry an eligibility check. */
  tenders: number;
  /** Their ids. */
  ids: string[];
  /** Every line met (or not stated). */
  meetAll: number;
  /** A line that fails or is at risk. */
  gaps: number;
  /** No gap, but a line waits on a reading of the tender. */
  reading: number;
  /** The first gap of each tender that has one, soonest check date first, at most three. */
  top: GapVM[];
  /** Each project, the tender lines it is evidence for. */
  evidence: Record<string, { tenderId: string; shortTitle: string; reqId: string; text: string; state: LineState }[]>;
}

export interface OverviewVM {
  identity: { name: string; monogram: string; accent: string; hq: string; employees: number; fyEnd: string; sectors: string[]; geographies: string[] };
  registrations: RegistrationVM[];
  figures: KeyFiguresVM;
  turnover: TurnoverBarVM[];
  record: RecordVM;
  /** The bid record's last 12 months, from the same sets as Company › Bid record. */
  bids: BidSummaryVM;
  usage: UsageVM;
}

const ROLE_ORDER: SimilarProject['role'][] = ['prime', 'jv-lead', 'jv-member', 'subcontractor'];

/** "Zakat certificate (ZATCA)" → "Zakat certificate". */
const credName = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '').trim();

function registrationPill(state: CredentialState, validTo: string | null): RegistrationVM['pill'] {
  const s = CREDENTIAL_STATE[state];
  if (validTo === null) return { label: 'No expiry', tone: 'green', icon: '✓' };
  const date = dayMonthYear(validTo);
  const label = state === 'expired' ? `Expired ${date}` : state === 'at-risk' ? `At risk, valid to ${date}` : state === 'expiring' ? `Expiring ${date}` : `Valid to ${date}`;
  return { label, tone: s.tone, icon: s.icon };
}

/** The line a gap row names: a certificate by the date it must hold to, otherwise the requirement itself. */
function gapText(l: EligibilityLine): string {
  const r = l.renew?.[0];
  return r ? `${credName(r.label)} must hold to ${dayMonth(l.checkedAgainst.date)}` : l.text;
}

const isGap = (l: EligibilityLine) => l.state === 'fail' || l.state === 'at-risk';

/** Where the eligibility checks read the profile: the viewer's live tenders with a check, line by line. */
export function usageFor(tenant: string, done: Done, viewer: Person): UsageVM {
  const d = dataOf(tenant);
  const q = queriesFor({ tenant, viewer, done });
  const checks = q.live().flatMap((l) => {
    const reg = d.register.find((t) => t.id === l.tenderId);
    const e = reg?.requirements?.length ? eligibilityFor(tenant, l.tenderId, done) : null;
    return e && !e.error ? [{ id: l.tenderId, shortTitle: l.shortTitle, e }] : [];
  });
  const evidence: UsageVM['evidence'] = {};
  for (const c of checks) {
    for (const line of c.e.lines) {
      for (const ev of line.evidence) {
        if (ev.kind !== 'project') continue;
        (evidence[ev.id] ??= []).push({ tenderId: c.id, shortTitle: c.shortTitle, reqId: line.reqId, text: line.text, state: line.state });
      }
    }
  }
  const withGaps = checks.flatMap((c) => {
    const lines = c.e.lines.filter(isGap)
      .sort((a, b) => Number(b.state === 'fail') - Number(a.state === 'fail') || a.checkedAgainst.date.localeCompare(b.checkedAgainst.date));
    return lines.length ? [{ c, lines }] : [];
  }).sort((a, b) => a.lines[0].checkedAgainst.date.localeCompare(b.lines[0].checkedAgainst.date) || a.c.id.localeCompare(b.c.id));
  const counts = (c: (typeof checks)[number]) => c.e.counts;
  return {
    tenders: checks.length,
    ids: checks.map((c) => c.id),
    meetAll: checks.filter((c) => counts(c).fail + counts(c).atRisk + counts(c).interpretation === 0).length,
    gaps: withGaps.length,
    reading: checks.filter((c) => counts(c).fail + counts(c).atRisk === 0 && counts(c).interpretation > 0).length,
    top: withGaps.slice(0, 3).map(({ c, lines }) => ({ tenderId: c.id, shortTitle: c.shortTitle, state: lines[0].state, text: gapText(lines[0]), more: lines.length - 1 })),
    evidence,
  };
}

function figuresOf(tenant: string, p: ProfileVM, vault: Vault, done: Done, viewer: Person): KeyFiguresVM {
  const ccy = profileOf(tenant).currency as MoneyVM['ccy'];
  const [latest, previous] = p.financials;
  const stated = p.financials.find((f) => f.netWorth);
  const inHome = (m: MoneyVM) => (m.ccy === ccy ? m.amount : convert(m.amount, m.ccy, ccy));
  const largest = [...p.projects].sort((a, b) => inHome(b.value) - inHome(a.value))[0];
  const years = p.projects.map((x) => x.completed.slice(0, 4)).sort();

  const rows = vault.rows;
  const next = rows.filter((r) => r.validTo !== null && r.validTo >= DEMO_TODAY)
    .sort((a, b) => a.validTo!.localeCompare(b.validTo!))[0];
  const expired = rows.filter((r) => r.state === 'expired').length;

  const f = facilityFor(tenant);
  const teams = teamsFor(tenant, done, viewer);
  const busiest = [...teams.teams].sort((a, b) => b.loadPct - a.loadPct)[0];
  const team = busiest && dataOf(tenant).teams.find((t) => t.id === busiest.id);
  // The committed peak over the team's bids, as CAP-1 reads it.
  const window = addDays(DEMO_TODAY, CAPACITY_WINDOW_DAYS - 1);
  const until = team ? team.commitments.reduce((mx, c) => (c.to > mx ? c.to : mx), window) : window;
  const peak = team ? peakMonth(team, DEMO_TODAY, until) : null;

  return {
    turnover: latest ? {
      fy: latest.fy, value: latest.turnover, audited: latest.audited, ...(latest.auditDate ? { auditDate: latest.auditDate } : {}),
      ...(previous ? { previous: { fy: previous.fy, value: previous.turnover } } : {}),
    } : null,
    netWorth: stated?.netWorth ? { fy: stated.fy, value: stated.netWorth, audited: stated.audited, ...(stated.currentRatio !== undefined ? { currentRatio: stated.currentRatio } : {}) } : null,
    projects: {
      count: p.projects.length,
      ...(years.length ? { firstYear: years[0], lastYear: years[years.length - 1] } : {}),
      ...(largest ? { largest: { id: largest.id, title: largest.title, value: largest.value } } : {}),
    },
    credentials: {
      held: rows.length, atRisk: vault.counts.atRisk, expired, valid: rows.length - vault.counts.atRisk - expired,
      ...(next ? { next: { id: next.id, text: rowsText([next], 1), validTo: next.validTo! } } : {}),
    },
    facility: { headroom: f.headroom, limit: f.limit, usedPct: f.usedPct, asOf: f.asOf },
    load: busiest && peak ? { team: busiest.name, pct: busiest.loadPct, windowLabel: teams.windowLabel, weeks: CAPACITY_WINDOW_DAYS / 7, peak: { pct: peak.pct, month: peak.month } } : null,
  };
}

function recordOf(tenant: string, p: ProfileVM): RecordVM {
  const ccy = profileOf(tenant).currency as MoneyVM['ccy'];
  const sum = (xs: ProjectVM[]): MoneyVM => ({ amount: xs.reduce((s, x) => s + inCcy(x.value, ccy).amount, 0), ccy });
  const max = (rows: Omit<RecordRowVM, 'pct'>[]) => Math.max(1, ...rows.map((r) => r.count));
  const withPct = (rows: Omit<RecordRowVM, 'pct'>[]): RecordRowVM[] => { const m = max(rows); return rows.map((r) => ({ ...r, pct: Math.round((r.count / m) * 100) })); };
  const countries = [...new Set(p.projects.map((x) => x.country))];
  return {
    total: p.projects.length,
    byCountry: withPct(countries.map((c) => { const xs = p.projects.filter((x) => x.country === c); return { key: c, label: c, count: xs.length, value: sum(xs) }; })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))),
    byRole: withPct(ROLE_ORDER.map((r) => { const xs = p.projects.filter((x) => x.roleKey === r); return { key: r, label: PROJECT_ROLE[r], count: xs.length, value: sum(xs) }; })),
    // `profileFor` lists the register most recent first.
    recent: p.projects.slice(0, 3),
  };
}

export function overviewFor(tenant: string, done: Done, viewer: Person, vault: Vault): OverviewVM {
  const prof = profileOf(tenant);
  const p = profileFor(tenant);
  const top = Math.max(1, ...p.financials.map((f) => f.turnover.amount));
  return {
    identity: { name: p.name, monogram: prof.monogram, accent: prof.accent, hq: p.hq, employees: p.employees, fyEnd: p.fyEnd, sectors: p.sectors, geographies: p.geographies },
    registrations: vault.rows
      .filter((r) => REGISTRATION_KINDS.includes(r.cred.kind))
      .sort((a, b) => REGISTRATION_KINDS.indexOf(a.cred.kind) - REGISTRATION_KINDS.indexOf(b.cred.kind) || a.cred.label.localeCompare(b.cred.label))
      .map((r) => ({
        id: r.id, label: r.cred.label, kind: KIND_LABEL[r.cred.kind], issuer: r.cred.issuer, ...(r.holder ? { holder: r.holder } : {}),
        state: r.state, pill: registrationPill(r.state, r.validTo),
      })),
    figures: figuresOf(tenant, p, vault, done, viewer),
    // Oldest first, so the bars read left to right as the years run.
    turnover: [...p.financials].reverse().map((f) => ({
      fy: f.fy, value: f.turnover, audited: f.audited, pct: Math.round((f.turnover.amount / top) * 100),
      ...(f.auditDate ? { auditDate: f.auditDate } : {}), ...(f.netWorth ? { netWorth: f.netWorth } : {}), ...(f.currentRatio !== undefined ? { currentRatio: f.currentRatio } : {}),
    })),
    record: recordOf(tenant, p),
    bids: bidSummaryFor(tenant, done, viewer),
    usage: usageFor(tenant, done, viewer),
  };
}
