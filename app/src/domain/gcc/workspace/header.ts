import type { Person } from '@/data/people';
import { personById } from '@/data/people';
import { TENANTS, type CountryCode } from '@/data/tenants';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { NEAR_WD } from '@/data/gcc/targets';
import { stageLabel, stepLabel } from '@/data/gcc/stages';
import { DEMO_TODAY, calendarDaysBetween, countdownText, dateText, workingDaysBetween } from '@/domain/calendar';
import { latestAddendumBadge } from '@/domain/gcc/s1/addenda';
import { authorityCalendar, countryCodeOf } from '@/domain/gcc/s1/common';
import { queriesFor, type DemoDone } from '@/domain/gcc/lifecycle.port';
import type { Health, MoneyVM, TenderRowVM, TrackerNodeVM, TrackerVM } from '../viewmodels';

/**
 * The Tender Workspace header (spec §4.1): what the tender is, where it
 * stands and what is due, in one glance. Read-only derivations of the port's
 * row and tracker, the register tender (007a) and the lifecycle.
 */

export interface TrackStepVM {
  key: string;
  /** "S1", "DG1". */
  short: string;
  /** "Intake", "DG1". */
  label: string;
  gate: boolean;
  status: TrackerNodeVM['status'];
  /** Later stages than the demo covers (after DG2) are muted (spec §4.1). */
  muted: boolean;
  /** For the tooltip: "S2 Sourcing: current, since 3 Mar". */
  title: string;
}

export interface WorkspaceHeaderVM {
  id: string;
  title: string;
  /** The register's full title, for the `title` attribute. */
  fullTitle: string;
  issuer: string;
  place: string;
  /** The country's flag emoji, when the country is one the demo has a calendar for. */
  flag: string | null;
  value: MoneyVM | null;
  /** "Estimate" or "Value not stated"; null for a published value. */
  valueNote: string | null;
  /** Open / PQ / Limited / Two-envelope; null without a register record. */
  procurement: string | null;
  stage: string;
  track: TrackStepVM[];
  due: null | {
    date: string; time?: string;
    /** The authority's time zone label. */
    tz: string;
    /** "63 days · 42 working days", in the authority's calendar. */
    countdown: string;
    workingDays: number;
    near: boolean;
  };
  /** In place of the countdown once submitted or closed: "Submitted Sun 1 Mar", "Discarded at DG1 · …". */
  dueNote: string | null;
  owner: { name: string; role: string | null } | null;
  /** The Bid Manager, when not the person it is with now. */
  bidManager: { name: string } | null;
  language: 'EN' | 'AR' | 'EN+AR' | null;
  restricted: boolean;
  addendum: string | null;
  health: Health;
}

const PROCUREMENT: Record<string, string> = { open: 'Open', pq: 'PQ', limited: 'Limited', 'two-file': 'Two-envelope' };
const LANGS = new Set(['EN', 'AR', 'EN+AR']);

/** Regional-indicator letters: 'SA' → 🇸🇦. */
const flagOf = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** "Sun 10 May": the year only outside the demo year. */
const shortDay = (iso: string) => (iso.startsWith(DEMO_TODAY.slice(0, 4)) ? dateText(iso.slice(0, 10)).replace(/ \d{4}$/, '') : dateText(iso.slice(0, 10)));

const STATUS_WORD: Record<TrackerNodeVM['status'], string> = { done: 'done', current: 'current', 'not-reached': 'not reached', stopped: 'stopped here' };

/** The tracker's nodes, compact: S1 · DG1 · S2 · S3 · DG2 · S4 … S9 · DG3, in the tracker's order. */
function trackOf(tracker: TrackerVM | null): TrackStepVM[] {
  if (!tracker) return [];
  const dg2 = tracker.nodes.findIndex((n) => n.key === 'DG2');
  return tracker.nodes.map((n, i) => {
    const since = n.from ? `, ${n.status === 'current' ? 'since' : 'from'} ${shortDay(n.from)}` : '';
    const who = n.decision ? `: ${n.decision.label} by ${n.decision.byName}` : '';
    return {
      key: n.key, short: n.kind === 'gate' ? n.label : n.key, label: n.label, gate: n.kind === 'gate', status: n.status,
      muted: i > dg2 && n.status === 'not-reached',
      title: `${n.kind === 'gate' ? n.label : `${n.key} ${n.label}`}: ${STATUS_WORD[n.status]}${who}${since}`,
    };
  });
}

/** The authority's calendar and time zone: the register's rule, else the lifecycle's country, else the tenant's. */
function calendarOf(tenant: string, row: TenderRowVM): { cc: CountryCode; tz: string } {
  const t = isGccTenantKey(tenant) ? gccData(tenant).register.find((x) => x.id === row.id) : undefined;
  if (t) {
    const a = authorityCalendar(t, tenant);
    return { cc: a.cc, tz: a.tz };
  }
  const own = TENANTS.find((x) => x.key === tenant);
  const cc = countryCodeOf(row.country) ?? own?.countryCode ?? 'SA';
  return { cc, tz: TENANTS.find((x) => x.countryCode === cc && x.world === 'gcc')?.tzLabel ?? own?.tzLabel ?? 'AST' };
}

export function workspaceHeader(ctx: { tenant: string; viewer: Person; done: DemoDone }, row: TenderRowVM, tracker: TrackerVM | null): WorkspaceHeaderVM {
  const { tenant } = ctx;
  const l = queriesFor(ctx).one(row.id);
  const reg = isGccTenantKey(tenant) ? gccData(tenant).register.find((x) => x.id === row.id) : undefined;
  const cc = countryCodeOf(row.country);

  // The documents' language: the intake event's, else the Stage 1 facts'. Never guessed.
  const intake = isGccTenantKey(tenant) ? gccData(tenant).intakeToday.find((e) => e.tenderId === row.id && e.docType !== 'Addendum') : undefined;
  const lang = intake?.language ?? (typeof row.facts.language === 'string' && LANGS.has(row.facts.language) ? row.facts.language as 'EN' | 'AR' | 'EN+AR' : null);

  const cal = calendarOf(tenant, row);
  const submitted = typeof row.facts.submittedAt === 'string' ? row.facts.submittedAt : null;
  const sub = row.submission;
  const due = row.live && sub && !submitted && calendarDaysBetween(DEMO_TODAY, sub.date) >= 0 ? (() => {
    const wd = workingDaysBetween(DEMO_TODAY, sub.date, cal.cc);
    return { date: sub.date, ...(sub.time ? { time: sub.time } : {}), tz: cal.tz, countdown: countdownText(DEMO_TODAY, sub.date, cal.cc), workingDays: wd, near: wd <= NEAR_WD };
  })() : null;
  const dueNote = due ? null
    : !row.live ? tracker?.outcome ?? null
    : submitted ? `Submitted ${shortDay(submitted)}`
    : sub ? `Submission was due ${shortDay(sub.date)}` : 'No submission deadline yet';

  const bm = personById(row.bidManagerId);
  return {
    id: row.id,
    title: row.shortTitle,
    fullTitle: reg?.title ?? tracker?.title ?? l?.title ?? row.shortTitle,
    issuer: row.issuer,
    place: [row.city, row.country].filter(Boolean).join(', '),
    flag: cc ? flagOf(cc) : null,
    value: row.value,
    valueNote: row.valueBasis === 'estimate' ? 'Estimate' : row.valueBasis === 'not-stated' || !row.value ? 'Value not stated' : null,
    procurement: reg ? PROCUREMENT[reg.procurement] ?? null : null,
    stage: row.live ? `${stageLabel(row.stage)} · ${stepLabel(row.stage, row.step)}` : stageLabel(row.stage),
    track: trackOf(tracker),
    due,
    dueNote,
    owner: row.ownerName ? { name: row.ownerName, role: row.ownerRole } : null,
    bidManager: bm && bm.id !== row.ownerId ? { name: bm.name } : null,
    language: lang,
    restricted: !!(reg?.restricted ?? l?.restricted),
    addendum: reg ? latestAddendumBadge(tenant, row.id) : null,
    health: row.health,
  };
}

