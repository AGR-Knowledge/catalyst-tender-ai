import type { Tone } from '@/data/types';
import type { KeyDateKind } from '@/data/gcc/types';
import { can, type Capability } from '@/data/access';
import { firstWithRole, personById, type Person } from '@/data/people';
import { CALENDARS } from '@/data/gcc/calendar';
import { stageShortLabel, stepLabel } from '@/data/gcc/stages';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TODAY, addDays, countdownText, dateText, weekdayOf, whenText } from '@/domain/calendar';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { DEMO_NOW, addHours } from '../clock';
import { dataPort } from '../port';
import { openGate, queriesFor, tenderCtx } from '../lifecycle';
import type { Lifecycle } from '@/data/gcc/lifecycle/types';
import { isOutstanding, requestsFor } from '../requests';
import { bidName, CREDENTIAL_STATE, vaultFor, type VaultRow } from '../company/vault';
import { bidBondFor, eligibilityFor, keyDatesFor, type KeyDateRow } from '../s1';
import { authorityCalendar, dayMonth, listText, monthName, plural, profileOf, shortDate, shortWhen, tenderOf } from '../s1/common';
import { isEscalated, isOverdue, packagesFor, rfqsFor, sentBy, type LiveRfq } from '../s2';
import { positionsFor } from '../dg2/positions';
import type { GateKey, Health, MoneyVM, TenderRowVM } from '../viewmodels';

/**
 * The calendar (plan 027b, spec §6.7): every dated item across the tenders the
 * viewer may see, read from the modules that already hold it, so the calendar
 * never disagrees with the Key dates tab, the tracker, the credentials vault
 * or the package board. Read only: nothing here writes.
 * - key dates (`keyDatesFor`, with the demo state, as the Dates tab reads them), in the authority's zone;
 * - the next gate's time limit (`row.nextGate.slaEnd`, as the tracker and Needs your action read it);
 * - supplier replies due, one item per tender, package and reply day (`rfqsFor`);
 * - credential expiries and renewal requests due (`vaultFor`);
 * - the viewer's own open or late requests (`requestsFor`).
 */

export type CalendarCategory = 'submissions' | 'deadlines' | 'meetings' | 'gates' | 'quotes' | 'validity' | 'requests';

/** The seven categories, in legend order. The page gives each one colour; these words are its meaning. */
export const CALENDAR_CATEGORIES: { key: CalendarCategory; label: string; items: string }[] = [
  { key: 'submissions', label: 'Submissions', items: 'Submission, bid opening, originals delivered' },
  { key: 'deadlines', label: 'Authority deadlines', items: 'Document purchase, participation, questions, answers' },
  { key: 'meetings', label: 'Meetings and visits', items: 'Site visits and pre-bid meetings' },
  { key: 'gates', label: 'Decision gates', items: 'DG1, DG2 and DG3 decisions due' },
  { key: 'quotes', label: 'Supplier quotes', items: 'Supplier replies due, per package' },
  { key: 'validity', label: 'Validity and renewals', items: 'Bid and guarantee validity, credential expiries, renewals' },
  { key: 'requests', label: 'Your requests', items: 'Inputs and requests you owe' },
];

export const CATEGORY_LABEL = Object.fromEntries(CALENDAR_CATEGORIES.map((c) => [c.key, c.label])) as Record<CalendarCategory, string>;

const CATEGORY_RANK = Object.fromEntries(CALENDAR_CATEGORIES.map((c, i) => [c.key, i])) as Record<CalendarCategory, number>;

/** "Published" is history, so it has no category and never shows. */
const KIND_CATEGORY: Record<Exclude<KeyDateKind, 'published'>, CalendarCategory> = {
  submission: 'submissions', opening: 'submissions', originals: 'submissions',
  purchase: 'deadlines', participation: 'deadlines', questions: 'deadlines', answers: 'deadlines',
  'site-visit': 'meetings', 'pre-bid': 'meetings',
  'validity-end': 'validity', 'bond-validity-end': 'validity',
};

/** The chip's short label per key date; the modal and the accessible name keep `KEY_DATE_LABEL`. */
const KIND_CHIP: Record<Exclude<KeyDateKind, 'published'>, string> = {
  submission: 'Submission', opening: 'Bid opening', originals: 'Originals due', purchase: 'Purchase closes', participation: 'Participation',
  'site-visit': 'Site visit', 'pre-bid': 'Pre-bid meeting', questions: 'Questions due', answers: 'Answers due',
  'validity-end': 'Bid validity ends', 'bond-validity-end': 'Guarantee valid to',
};

/** What an item was read from, so its detail reads the same module again. */
type ItemRef =
  | { kind: 'key-date'; tenderId: string; keyDate: KeyDateKind }
  | { kind: 'submission'; tenderId: string }
  | { kind: 'gate'; tenderId: string; gate: GateKey }
  | { kind: 'quotes'; tenderId: string; pkgId: string; pkgTitle: string; rfqIds: string[] }
  | { kind: 'credential'; credId: string; what: 'expiry' | 'renewal' }
  | { kind: 'request'; requestId: string };

export interface CalendarItemVM {
  /** Stable: `kd:T-2025-298:submission:2026-03-12`, `gate:T-2026-097:DG2`, `rfq:T-2026-104:P-03:2026-03-10`. */
  id: string;
  category: CalendarCategory;
  title: string;
  /** The short label a chip shows before the tender's short title: "Submission", "DG2 due", "Quotes · Pumps and valves". */
  chip: string;
  date: string;
  time?: string;
  /** The authority's zone for key dates, the tenant's for the rest. */
  tz: string;
  allDay: boolean;
  tenderId?: string;
  shortTitle?: string;
  /** Full sentences: the key date's calendar flags, an overdue gate or reply, a late request. */
  flags: string[];
  /** The viewer owns or manages the tender, decides the gate, owns the credential or owes the request. */
  mine: boolean;
  /** Behind the demo clock. */
  past: boolean;
  ref: ItemRef;
}

export interface CalendarCtx { tenant: string; viewer: Person; done: Readonly<Record<string, string>> }

const NOW = DEMO_NOW;
const dayOf = (iso: string) => iso.slice(0, 10);
const timeOfIso = (iso: string) => (iso.length > 10 ? iso.slice(11, 16) : undefined);
/** A date-time behind the demo clock. A date alone is behind it from the next day. */
const isPast = (date: string, time?: string) => date < DEMO_TODAY || (date === DEMO_TODAY && !!time && `${date}T${time}` < NOW);
/** "Zakat certificate" from "Zakat certificate (ZATCA)". */
const credName = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '');

const DECIDE: Record<GateKey, Capability> = { DG1: 'dg1.decide', DG2: 'dg2.decide', DG3: 'dg3.decide' };

function visibleRows(ctx: CalendarCtx): TenderRowVM[] {
  return dataPort()?.rows(ctx.tenant, { kind: 'all' }, ctx.viewer, 'live', ctx.done) ?? [];
}

const runsTender = (row: TenderRowVM, viewer: Person) => row.ownerId === viewer.id || row.bidManagerId === viewer.id;

/** Every item in `from`…`to` (ISO dates, inclusive), by date, then time (untimed last in a day), then category. */
export function calendarItems({ tenant, viewer, done, from, to }: CalendarCtx & { from: string; to: string }): CalendarItemVM[] {
  const ctx = { tenant, viewer, done };
  const d = done as Record<string, string>;
  const rows = visibleRows(ctx);
  const q = queriesFor(ctx);
  const tz = profileOf(tenant).tzLabel;
  const within = (date: string) => date >= from && date <= to;
  const out: CalendarItemVM[] = [];

  for (const row of rows) {
    const runs = runsTender(row, viewer);
    const tender = { tenderId: row.id, shortTitle: row.shortTitle };

    // 1. Key dates, as the Dates tab reads them. Published is history.
    const kds = keyDatesFor(tenant, row.id, d).filter((k): k is KeyDateRow & { kind: Exclude<KeyDateKind, 'published'> } => k.kind !== 'published');
    for (const k of kds.filter((x) => within(x.date))) {
      out.push({
        id: `kd:${row.id}:${k.kind}:${k.date}`, category: KIND_CATEGORY[k.kind], title: k.label, chip: KIND_CHIP[k.kind],
        date: k.date, ...(k.time ? { time: k.time } : {}), tz: k.tz, allDay: !k.time, ...tender,
        flags: k.flags.map((f) => f.text), mine: runs, past: k.past, ref: { kind: 'key-date', tenderId: row.id, keyDate: k.kind },
      });
    }
    // A tender without typed key dates (the Stage 4–9 register) still shows its submission.
    if (!kds.length && row.submission && within(row.submission.date)) {
      const s = row.submission;
      out.push({
        id: `sub:${row.id}:${s.date}`, category: 'submissions', title: 'Submission deadline', chip: KIND_CHIP.submission,
        date: s.date, ...(s.time ? { time: s.time } : {}), tz, allDay: !s.time, ...tender,
        flags: [], mine: runs, past: isPast(s.date, s.time), ref: { kind: 'submission', tenderId: row.id },
      });
    }

    // 2. The next gate's time limit.
    const g = row.nextGate;
    if (g?.slaEnd && within(dayOf(g.slaEnd))) {
      const l = q.one(row.id);
      const decides = !!l && can(viewer, DECIDE[g.gate], tenderCtx(tenant, l)).ok;
      const late = g.slaEnd < NOW;
      out.push({
        id: `gate:${row.id}:${g.gate}`, category: 'gates', title: `${g.gate} decision due`, chip: `${g.gate} due`,
        date: dayOf(g.slaEnd), ...(timeOfIso(g.slaEnd) ? { time: timeOfIso(g.slaEnd) } : {}), tz, allDay: !timeOfIso(g.slaEnd), ...tender,
        flags: late ? [`The ${g.gate} time limit has passed: the decision is overdue`] : [],
        mine: runs || decides, past: late, ref: { kind: 'gate', tenderId: row.id, gate: g.gate },
      });
    }

    // 3. Supplier replies due: one item per package and reply day, at the earliest reply time that day.
    if (can(viewer, 'sourcing.view').ok) {
      const rfqs = rfqsFor(tenant, row.id, d).filter((r) => sentBy(r));
      const groups = new Map<string, LiveRfq[]>();
      for (const r of rfqs) {
        const key = `${r.packageId}|${dayOf(r.replyBy)}`;
        groups.set(key, [...(groups.get(key) ?? []), r]);
      }
      const titles = new Map(packagesFor(tenant, row.id, d).map((p) => [p.pkg.id, p.pkg.title]));
      for (const [key, rs] of groups) {
        const [pkgId, day] = key.split('|');
        if (!within(day)) continue;
        const first = rs.map((r) => r.replyBy).sort()[0];
        const overdue = rs.filter((r) => isOverdue(r)).length;
        const pkgTitle = titles.get(pkgId) ?? pkgId;
        out.push({
          id: `rfq:${row.id}:${pkgId}:${day}`, category: 'quotes', title: `Quotes due · ${pkgTitle}`, chip: `Quotes · ${pkgTitle}`,
          date: day, ...(timeOfIso(first) ? { time: timeOfIso(first) } : {}), tz, allDay: !timeOfIso(first), ...tender,
          flags: overdue ? [`${overdue} of ${plural(rs.length, 'reply', 'replies')} overdue`] : [],
          mine: runs, past: first < NOW, ref: { kind: 'quotes', tenderId: row.id, pkgId, pkgTitle, rfqIds: rs.map((r) => r.id) },
        });
      }
    }
  }

  // 4. Credential expiries and renewal requests due. A renewal the viewer owes shows under Your requests instead.
  if (can(viewer, 'company.view').ok) {
    for (const c of vaultFor(tenant, d, viewer).rows) {
      const owns = c.owner?.id === viewer.id;
      if (c.validTo && within(c.validTo)) {
        const gone = c.validTo < DEMO_TODAY;
        out.push({
          id: `cred:${c.id}:expiry`, category: 'validity', title: `${credName(c.cred.label)} ${gone ? 'expired' : 'expires'}`, chip: `${credName(c.cred.label)} ${gone ? 'expired' : 'expires'}`,
          date: c.validTo, tz, allDay: true,
          flags: c.state === 'at-risk' || c.state === 'expired' ? [c.why] : [],
          mine: owns, past: gone, ref: { kind: 'credential', credId: c.id, what: 'expiry' },
        });
      }
      const r = c.request;
      if (r?.due && !owns && (r.status === 'open' || r.status === 'late') && within(dayOf(r.due))) {
        out.push({
          id: `cred:${c.id}:renewal`, category: 'validity', title: `Renewal due · ${credName(c.cred.label)}`, chip: `Renewal · ${credName(c.cred.label)}`,
          date: dayOf(r.due), ...(timeOfIso(r.due) ? { time: timeOfIso(r.due) } : {}), tz, allDay: !timeOfIso(r.due),
          flags: r.status === 'late' ? [`Late: the renewal was due ${shortWhen(r.due)}`] : [],
          mine: owns, past: r.due < NOW, ref: { kind: 'credential', credId: c.id, what: 'renewal' },
        });
      }
    }
  }

  // 5. The viewer's own open or late requests. A tender the viewer may not open is left off the item.
  for (const r of requestsFor(tenant, viewer.id, d, viewer).filter(isOutstanding)) {
    if (!within(dayOf(r.due))) continue;
    const t = r.tenderId && q.one(r.tenderId) ? { tenderId: r.tenderId, shortTitle: r.shortTitle } : {};
    out.push({
      id: `req:${r.id}`, category: 'requests', title: r.what, chip: r.what,
      date: dayOf(r.due), ...(timeOfIso(r.due) ? { time: timeOfIso(r.due) } : {}), tz, allDay: !timeOfIso(r.due), ...t,
      flags: r.status === 'late' ? [`Late: it was due ${shortWhen(r.due)}`] : [],
      mine: true, past: r.due < NOW, ref: { kind: 'request', requestId: r.id },
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date)
    || (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
    || CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]
    || a.title.localeCompare(b.title)
    || a.id.localeCompare(b.id));
}

/* ------------------------------------------------------------ the working calendar */

/** Weekday numbers (0 = Sunday) of the weekend in a country: Fri–Sat in KSA, Sat–Sun in the UAE. */
export const weekendDays = (cc: CountryCode): number[] => CALENDARS[cc].weekend;

export interface CalendarBanner {
  key: string;
  kind: 'closure' | 'ramadan';
  label: string;
  from: string;
  to: string;
  /** The full sentence, for the accessible name. */
  detail: string;
}

/** The all-day banners in `from`…`to`: closures ("Eid al-Fitr, expected") and Ramadan's reduced hours, in the tenant's country. */
export function calendarBanners(cc: CountryCode, from: string, to: string): CalendarBanner[] {
  const cal = CALENDARS[cc];
  const out: CalendarBanner[] = [];
  const r = cal.ramadan;
  if (r && r.to >= from && r.from <= to) {
    out.push({
      key: `ramadan:${r.from}`, kind: 'ramadan', label: `Ramadan hours ${r.hours}${r.expected ? ', expected' : ''}`, from: r.from, to: r.to,
      detail: `Ramadan reduced hours${r.expected ? ' (expected)' : ''}: the public sector works ${r.hours} until ${dateText(r.to)}`,
    });
  }
  for (const c of cal.closures.filter((x) => x.to >= from && x.from <= to)) {
    out.push({
      key: `closure:${c.from}`, kind: 'closure', label: `${c.name}${c.expected ? ', expected' : ''}`, from: c.from, to: c.to,
      detail: `${c.name}: public-sector closure ${c.expected ? 'expected ' : ''}${c.from === c.to ? dateText(c.from) : `${dateText(c.from)} to ${dateText(c.to)}`}${c.expected ? '. Dates depend on moon sighting' : ''}`,
    });
  }
  return out;
}

/** The Sunday on or before `iso`: GCC weeks start on Sunday. */
export const weekStart = (iso: string) => addDays(iso, -weekdayOf(iso));

/** "Times in the authority's zone · AST", or both zones when the tenant's differs from an authority's. */
export function tzNote(items: CalendarItemVM[], tenant: string): string {
  const own = profileOf(tenant).tzLabel;
  const zones = [...new Set(items.filter((i) => i.ref.kind === 'key-date').map((i) => i.tz))];
  const others = zones.filter((z) => z !== own);
  if (!others.length) return `Times in the authority's zone · ${own}`;
  return `Key dates in the authority's zone (${listText(zones)}) · other times in ${own}`;
}

/* ------------------------------------------------------------ the detail modal */

export interface NeedVM { text: string; tone?: Tone }

export interface OtherDateVM { key: string; label: string; date: string; time?: string; tz: string; past: boolean; current: boolean }

export interface CalendarActionVM { label: string; to: string; primary?: boolean }

export interface CalendarDetailVM {
  item: CalendarItemVM;
  categoryLabel: string;
  when: {
    /** "Thu 12 Mar 2026, 10:00 AST". */
    text: string;
    /** "in 4 days · 4 working days", "Today", "Passed", "Overdue". */
    countdown: string;
    /** The same moment in the tenant's zone, when an authority's zone differs: "Thu 12 Mar 2026, 11:00 GST in your time zone". */
    tenantText?: string;
  };
  where?: string;
  /** The page of the tender document that states the date. */
  source?: { tenderId: string; page: number };
  tender?: {
    id: string; shortTitle: string; issuer: string; stage: string; step: string;
    ownerName: string | null; ownerRole: string | null; health: Health; value: MoneyVM | null; valueNote: string | null;
  };
  needs: NeedVM[];
  /** A gate's time limit, for `SlaClock`. */
  sla?: { start: string; end: string };
  otherDates: OtherDateVM[];
  actions: CalendarActionVM[];
}

/** Standard offsets from UTC of the zone labels the demo uses. */
const UTC_OFFSET: Record<string, number> = { AST: 3, GST: 4, 'UTC+3': 3, EET: 2 };

function tenantTimeText(item: CalendarItemVM, tenant: string): string | undefined {
  const own = profileOf(tenant).tzLabel;
  if (!item.time || item.tz === own) return undefined;
  const a = UTC_OFFSET[item.tz];
  const b = UTC_OFFSET[own];
  if (a === undefined || b === undefined) return undefined;
  const at = addHours(`${item.date}T${item.time}`, b - a);
  return `${whenText(dayOf(at), timeOfIso(at), own)} in your time zone`;
}


/** The country whose working days count for an item: the authority's for a key date, the tenant's for the rest. */
function ccOf(item: CalendarItemVM, tenant: string): CountryCode {
  const t = item.ref.kind === 'key-date' ? tenderOf(tenant, item.ref.tenderId) : undefined;
  return t ? authorityCalendar(t, tenant).cc : profileOf(tenant).countryCode;
}

/** "in 4 days · 4 working days", "Today", "Passed"; "Overdue" for a gate and "Late" for a request once behind the clock. */
export function itemCountdown(item: CalendarItemVM, tenant: string): string {
  if (item.past) return item.ref.kind === 'gate' ? 'Overdue' : item.category === 'requests' || (item.ref.kind === 'credential' && item.ref.what === 'renewal') ? 'Late' : 'Passed';
  if (item.date === DEMO_TODAY) return 'Today';
  return `in ${countdownText(DEMO_TODAY, item.date, ccOf(item, tenant))}`;
}

/** The accessible name of a chip: "Submission deadline, T-2025-298 Makkah water distribution, Thu 12 Mar 10:00 AST, Submissions". */
export function itemLabel(item: CalendarItemVM): string {
  return [
    item.title,
    item.tenderId && `${item.tenderId} ${item.shortTitle ?? ''}`.trim(),
    `${shortDate(item.date)}${item.time ? ` ${item.time} ${item.tz}` : ''}`,
    CATEGORY_LABEL[item.category],
    item.flags.length ? 'flagged' : '',
    item.past ? 'passed' : '',
  ].filter(Boolean).join(', ');
}

/** "March 2026". */
export const monthTitle = (first: string) => `${monthName(first)} ${first.slice(0, 4)}`;

/** "8 – 14 Mar 2026", "29 Mar – 4 Apr 2026", "28 Dec 2025 – 3 Jan 2026". */
export function spanTitle(from: string, to: string): string {
  const [fy, fm] = [from.slice(0, 4), from.slice(5, 7)];
  const [ty, tm] = [to.slice(0, 4), to.slice(5, 7)];
  const end = `${dayMonth(to)} ${ty}`;
  if (fy !== ty) return `${dayMonth(from)} ${fy} – ${end}`;
  if (fm !== tm) return `${dayMonth(from)} – ${end}`;
  return `${Number(from.slice(8, 10))} – ${end}`;
}

const VERB: Record<VaultRow['bids'][number]['checkLabel'], string> = { opens: 'opens', 'is submitted': 'is submitted', 'stays valid': 'must stay valid to' };

function credentialNeeds(c: VaultRow, flags: string[]): NeedVM[] {
  const s = CREDENTIAL_STATE[c.state];
  const bids = c.bids.slice(0, 3).map((b) => `${bidName(b)}${b.canOpen && b.shortTitle ? ` ${b.shortTitle}` : ''} ${VERB[b.checkLabel]} ${shortDate(b.checkDate)}`);
  const more = c.bids.length > 3 ? ` and ${c.bids.length - 3} more` : '';
  const r = c.request;
  const renewal = c.renewal
    ? `Renewed to ${dateText(c.renewal.validTo)}${c.renewal.by ? ` by ${c.renewal.by.name}` : ''}`
    : r ? `Renewal asked for${r.by ? ` by ${r.by.name}` : ''} ${shortWhen(r.at)}${r.due ? `, due ${shortWhen(r.due)}` : ''}: ${r.status === 'late' ? 'late' : r.status === 'open' ? 'waiting for the owner' : 'uploaded'}`
      : 'No renewal asked for yet';
  return [
    // The flag under When already gives the reason for an at-risk or expired credential.
    { text: flags.includes(c.why) ? s.label : `${s.label}: ${c.why}`, tone: s.tone },
    ...(bids.length ? [{ text: `Live bids that need it: ${listText(bids)}${more}` }] : []),
    ...(c.owner ? [{ text: `Owner: ${c.owner.name}, ${c.owner.title}` }] : []),
    { text: renewal, ...(r?.status === 'late' ? { tone: 'red' as Tone } : {}) },
  ];
}

/** What a Stage 5–8 tender still needs before submission, from its stage facts (017). Prices and margins are left out. */
function stageNeeds(f: Lifecycle['facts'] | undefined): NeedVM[] {
  switch (f?.stage) {
    case 5:
      return [{ text: `Price due ${shortWhen(f.priceDue)} · finance check ${f.financeCheck}`, tone: f.financeCheck === 'confirmed' ? 'green' : 'orange' }];
    case 6:
      return [{ text: `Proposal: ${f.sections.locked} of ${plural(f.sections.total, 'section')} locked${f.sections.late ? `, ${f.sections.late} late` : ''}`, tone: f.sections.late ? 'orange' : undefined }];
    case 7:
      return [
        { text: `Compliance: ${f.requirements.evidenced} of ${plural(f.requirements.total, 'requirement')} evidenced`, tone: f.requirements.evidenced === f.requirements.total ? 'green' : 'orange' },
        ...(f.mandatoryGaps ? [{ text: `${plural(f.mandatoryGaps, 'mandatory gap')} open`, tone: 'red' as Tone }] : []),
        ...(f.redlinesOpen ? [{ text: `${plural(f.redlinesOpen, 'redline')} open`, tone: 'orange' as Tone }] : []),
      ];
    case 8: {
      const bond = f.bond;
      return [
        { text: `Submission package ${f.packageReadyPct}% ready`, tone: f.packageReadyPct >= 100 ? 'green' : 'orange' },
        { text: f.signaturesPending ? `${plural(f.signaturesPending, 'signature')} still to collect` : 'Every signature collected', tone: f.signaturesPending ? 'orange' : 'green' },
        bond.issued
          ? { text: `Bid bond issued, valid to ${dateText(bond.validTo)}${bond.validTo < bond.requiredTo ? `: it must hold to ${dateText(bond.requiredTo)}` : ''}`, tone: bond.validTo < bond.requiredTo ? 'red' : 'green' }
          : { text: `Bid bond not issued yet: it must hold to ${dateText(bond.requiredTo)}`, tone: 'orange' },
      ];
    }
    default:
      return [];
  }
}

/**
 * Everything the modal shows about one item, read on demand from the same
 * modules as the item. Null when the item no longer exists for this viewer.
 */
export function calendarItemDetail(id: string, ctx: CalendarCtx): CalendarDetailVM | null {
  const { tenant, viewer, done } = ctx;
  const d = done as Record<string, string>;
  const item = calendarItems({ ...ctx, from: '0000-01-01', to: '9999-12-31' }).find((i) => i.id === id);
  if (!item) return null;
  const q = queriesFor(ctx);
  const row = item.tenderId ? visibleRows(ctx).find((r) => r.id === item.tenderId) : undefined;
  const kds = item.tenderId ? keyDatesFor(tenant, item.tenderId, d).filter((k) => k.kind !== 'published') : [];
  const kd = item.ref.kind === 'key-date' ? kds.find((k) => item.id === `kd:${k.tenderId}:${k.kind}:${k.date}`) : undefined;
  const opens = (path: string, cap: Capability) => isScreenBuilt(path) && can(viewer, cap).ok;
  const hot = firstWithRole(tenant, 'hot');

  const needs: NeedVM[] = [];
  let sla: CalendarDetailVM['sla'];
  const secondary: CalendarActionVM[] = [];

  switch (item.category) {
    case 'submissions': {
      const b = item.tenderId ? bidBondFor(tenant, item.tenderId, d) : null;
      if (b) needs.push({ text: `Initial guarantee: ${b.rateText}. ${b.validityText}. Bank lead time ${b.bankLeadDays} working days` });
      if (b?.facilityTight) needs.push({ text: 'Finance must confirm the guarantee facility: after this bond it would not cover the guarantees due on award', tone: 'orange' });
      const e = item.tenderId ? eligibilityFor(tenant, item.tenderId, d) : null;
      if (e) needs.push({ text: `Eligibility: ${e.text}`, tone: e.counts.fail ? (e.verdict === 'eligible-with-jv' ? 'orange' : 'red') : e.counts.atRisk ? 'orange' : 'green' });
      // A tender on the Stage 4–9 register has no Stage 1 record: its stage facts say what is left.
      if (!b && !e && item.tenderId) needs.push(...stageNeeds(q.one(item.tenderId)?.facts));
      if (row?.nextGate) needs.push({ text: `Next gate: ${row.nextGate.label}` });
      break;
    }
    case 'gates': {
      if (item.ref.kind !== 'gate') break;
      const gate = item.ref.gate;
      const l = q.one(item.ref.tenderId);
      const g = l ? openGate(l) : null;
      if (g) sla = { start: g.openedAt, end: g.slaEnd };
      if (gate === 'DG1') {
        const bm = personById(row?.bidManagerId);
        needs.push({ text: bm ? `Recorded by the assigned Bid Manager, ${bm.name}, with the DG1 evidence pack` : 'No Bid Manager is assigned yet: DG1 is recorded by the assigned Bid Manager' });
      } else if (gate === 'DG2') {
        needs.push({ text: `Approved by the Head of Tendering${hot ? `, ${hot.name},` : ''} after the committee's positions` });
        if (can(viewer, 'see.positions', l ? tenderCtx(tenant, l) : {}).ok) {
          const p = positionsFor(tenant, item.ref.tenderId, d);
          needs.push({ text: `Committee: ${p.quorum.text}`, tone: p.quorum.met ? 'green' : 'orange' });
          if (p.recorded) needs.push({ text: `So far: ${p.majority.for} for · ${p.majority.against} against · ${p.majority.abstain} abstaining` });
        } else {
          needs.push({ text: 'With the committee. Its positions are masked for your role' });
        }
      } else {
        needs.push({ text: `Approved by the Head of Tendering${hot ? `, ${hot.name},` : ''} on Compliance's DG3 pack` });
      }
      const path = `/${gate.toLowerCase()}`;
      const cap: Capability = gate === 'DG1' ? 'dg1.view' : gate === 'DG2' ? 'dg2.view' : 'dg3.view';
      if (opens(path, cap)) secondary.push({ label: gate === 'DG1' ? 'Open DG1 decisions' : `Open ${gate} approvals`, to: `${path}?tender=${encodeURIComponent(item.ref.tenderId)}` });
      break;
    }
    case 'quotes': {
      if (item.ref.kind !== 'quotes') break;
      const ids = new Set(item.ref.rfqIds);
      const rs = rfqsFor(tenant, item.ref.tenderId, d).filter((r) => ids.has(r.id));
      const replied = rs.filter((r) => r.repliedAt).length;
      const overdue = rs.filter((r) => isOverdue(r)).length;
      const escalated = rs.filter((r) => isEscalated(tenant, r)).length;
      needs.push({ text: `${replied} of ${plural(rs.length, 'supplier')} replied`, tone: replied === rs.length ? 'green' : undefined });
      if (overdue) needs.push({ text: `${overdue} overdue: ${escalated ? `${escalated} escalated to the Procurement Lead` : 'reminder sent'}`, tone: escalated ? 'red' : 'orange' });
      needs.push({ text: `Package ${item.ref.pkgId}: ${item.ref.pkgTitle}` });
      if (opens('/sourcing', 'sourcing.view')) secondary.push({ label: 'Open the package board', to: `/sourcing?tender=${encodeURIComponent(item.ref.tenderId)}&s=tracking` });
      break;
    }
    case 'requests': {
      if (item.ref.kind !== 'request') break;
      const requestId = item.ref.requestId;
      const r = requestsFor(tenant, viewer.id, d, viewer).find((x) => x.id === requestId);
      if (r) {
        const by = personById(r.requestedById);
        needs.push({ text: r.what });
        if (r.section) needs.push({ text: `Feeds ${r.section}` });
        if (by) needs.push({ text: `Asked by ${by.name} ${shortWhen(r.requestedAt)}` });
        needs.push(r.status === 'late' ? { text: 'Late', tone: 'red' } : { text: 'Open: waiting for you' });
      }
      secondary.push({ label: 'Open my requests', to: '/requests' });
      break;
    }
    case 'validity': {
      if (item.ref.kind === 'credential') {
        const credId = item.ref.credId;
        const c = can(viewer, 'company.view').ok ? vaultFor(tenant, d, viewer).rows.find((x) => x.id === credId) : undefined;
        if (c) needs.push(...credentialNeeds(c, item.flags));
        if (opens('/company', 'company.view')) secondary.push({ label: 'Open the credential', to: `/company?tab=credentials&cred=${encodeURIComponent(credId)}` });
      } else if (kd?.note) {
        needs.push({ text: kd.note });
      }
      break;
    }
    default:
      if (kd?.note) needs.push({ text: kd.note });
  }

  // The tender's other key dates, with this item in its place.
  const otherDates: OtherDateVM[] = kds.map((k) => ({
    key: `kd:${k.tenderId}:${k.kind}:${k.date}`, label: k.label, date: k.date, ...(k.time ? { time: k.time } : {}), tz: k.tz, past: k.past,
    current: item.id === `kd:${k.tenderId}:${k.kind}:${k.date}`,
  }));
  if (item.tenderId && !otherDates.some((o) => o.current)) {
    otherDates.push({ key: item.id, label: item.title, date: item.date, ...(item.time ? { time: item.time } : {}), tz: item.tz, past: item.past, current: true });
    otherDates.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  }

  const actions: CalendarActionVM[] = [];
  if (item.tenderId && q.one(item.tenderId)) {
    actions.push({ label: 'Open tender', to: `/tenders/${encodeURIComponent(item.tenderId)}?tab=${item.category === 'gates' ? 'overview' : 'dates'}`, primary: true });
  }
  actions.push(...secondary.map((a, i) => (actions.length || i ? a : { ...a, primary: true })));

  return {
    item,
    categoryLabel: CATEGORY_LABEL[item.category],
    when: {
      text: item.time ? whenText(item.date, item.time, item.tz) : dateText(item.date),
      countdown: itemCountdown(item, tenant),
      ...(tenantTimeText(item, tenant) ? { tenantText: tenantTimeText(item, tenant) } : {}),
    },
    ...(kd?.place ? { where: kd.place } : {}),
    ...(kd?.page && item.tenderId ? { source: { tenderId: item.tenderId, page: kd.page } } : {}),
    ...(row ? {
      tender: {
        id: row.id, shortTitle: row.shortTitle, issuer: row.issuer, stage: stageShortLabel(row.stage), step: stepLabel(row.stage, row.step),
        ownerName: row.ownerName, ownerRole: row.ownerRole, health: row.health, value: row.value,
        valueNote: row.valueBasis === 'estimate' ? 'Estimate' : row.valueBasis === 'not-stated' || !row.value ? 'Value not stated' : null,
      },
    } : {}),
    needs,
    ...(sla ? { sla } : {}),
    otherDates,
    actions,
  };
}
