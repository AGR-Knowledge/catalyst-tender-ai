import type { KeyDateKind } from '@/data/gcc/types';
import type { Tone } from '@/data/types';
import { CALENDARS } from '@/data/gcc/calendar';
import { s1Data } from '@/data/gcc/s1';
import { firstWithRole } from '@/data/people';
import { DEMO_TIME, DEMO_TODAY, addDays, calendarDaysBetween, dayFlags, weekendText, workingDaysBetween } from '@/domain/calendar';
import { DEMO_NOW, addHours } from '@/domain/gcc/clock';
import { BANK_LEAD_DAYS } from './bond';
import { authorityCalendar, dayMonthYear, keyDate, openingOf, profileOf, shortDate, tenderOf } from './common';

/**
 * Key dates in the authority's calendar, with GCC flags and reminders (spec
 * §6.7, plan 007a step 4.2), and the preparation-time ratio (SCR-8, step 4.3).
 * Working days count the authority's weekend and expected closures, not the
 * tenant's: the hero is a KSA tender in every tenant.
 */

export const KEY_DATE_LABEL: Record<KeyDateKind, string> = {
  published: 'Published', purchase: 'Document purchase closes', participation: 'Participation confirmation', 'site-visit': 'Site visit',
  'pre-bid': 'Pre-bid meeting', questions: 'Questions deadline', answers: 'Answers to questions', submission: 'Submission deadline',
  originals: 'Original initial guarantee delivered', opening: 'Bid opening', 'validity-end': 'Bid validity ends', 'bond-validity-end': 'Initial guarantee valid to',
};

/** Events on a day: weekend and holiday flags apply. Validity ends are periods, not events. */
const EVENT_KINDS = new Set<KeyDateKind>(['purchase', 'participation', 'site-visit', 'pre-bid', 'questions', 'answers', 'submission', 'originals', 'opening']);
/** Someone attends the authority in person: Ramadan office hours matter. */
const IN_PERSON = new Set<KeyDateKind>(['site-visit', 'pre-bid', 'originals']);
/** The bidder must act by then: reminders and escalation apply. */
const DEADLINES = new Set<KeyDateKind>(['purchase', 'participation', 'site-visit', 'pre-bid', 'questions', 'submission', 'originals']);

export interface KeyDateFlag { key: string; text: string }

export interface KeyDateRow {
  tenant: string;
  tenderId: string;
  kind: KeyDateKind;
  label: string;
  date: string;
  time?: string;
  /** The authority's time zone label. */
  tz: string;
  place?: string;
  page?: number;
  note?: string;
  daysLeft: number;
  workingDaysLeft: number;
  past: boolean;
  flags: KeyDateFlag[];
  /** The authority's country has no demo calendar; the tenant's is used. */
  calendarFallback?: boolean;
}

const closureName = (iso: string, cc: keyof typeof CALENDARS) => CALENDARS[cc].closures.find((c) => iso >= c.from && iso <= c.to)?.name ?? 'holiday';

/** Key dates of one tender, in the order the tender gives them. */
export function keyDatesFor(tenant: string, tenderId: string): KeyDateRow[] {
  const t = tenderOf(tenant, tenderId);
  if (!t) return [];
  const { cc, tz, fallback } = authorityCalendar(t, tenant);
  const opening = openingOf(t);

  return t.keyDates.map((k) => {
    const label = KEY_DATE_LABEL[k.kind];
    const past = k.date < DEMO_TODAY || (k.date === DEMO_TODAY && !!k.time && k.time < DEMO_TIME);
    const flags: KeyDateFlag[] = [];
    const on = `${label} ${shortDate(k.date)}`;
    if (!past && EVENT_KINDS.has(k.kind)) {
      for (const f of dayFlags(k.date, cc)) {
        if (f.key === 'closure-expected') {
          flags.push({
            key: 'closure-expected',
            text: k.kind === 'answers'
              ? `${label} are due ${shortDate(k.date)}, inside the expected ${closureName(k.date, cc)} closure (dates depend on moon sighting): expect a delay`
              : `${on} falls inside the expected ${closureName(k.date, cc)} closure (dates depend on moon sighting): check whether it moves`,
          });
        } else if (f.key === 'closure') {
          flags.push({ key: 'closure', text: `${on} falls on a public holiday (${closureName(k.date, cc)})` });
        } else if (f.key === 'weekend') {
          flags.push({ key: 'weekend', text: `${on} falls on a weekend (${weekendText(cc)})` });
        } else if (f.key === 'ramadan-hours' && IN_PERSON.has(k.kind)) {
          flags.push({ key: 'ramadan-hours', text: `${on} falls during Ramadan reduced hours: authority office hours are shorter; confirm the slot` });
        }
      }
    }
    // Derived rule 1: the initial guarantee's validity, and the bank's lead time.
    if (!past && k.kind === 'bond-validity-end' && opening) {
      flags.push({
        key: 'bond-validity',
        text: `Initial guarantee must be valid at least ${calendarDaysBetween(opening.date, k.date)} days from opening (to ${dayMonthYear(k.date)}): bank lead time ${BANK_LEAD_DAYS} working days`,
      });
    }
    // Derived rule 2: documents not yet bought before the purchase closes. The platform never pays.
    if (!past && k.kind === 'purchase' && t.documentFee && !t.intake.purchasedAt) {
      const wd = workingDaysBetween(DEMO_TODAY, k.date, cc);
      flags.push({ key: 'purchase-open', text: `Documents not yet bought: purchase closes ${shortDate(k.date)}, ${wd} working day${wd === 1 ? '' : 's'} left. A person approves and pays` });
    }
    return {
      tenant, tenderId, kind: k.kind, label, date: k.date, tz, flags, past,
      ...(k.time ? { time: k.time } : {}), ...(k.place ? { place: k.place } : {}), ...(k.page ? { page: k.page } : {}), ...(k.note ? { note: k.note } : {}),
      daysLeft: calendarDaysBetween(DEMO_TODAY, k.date),
      workingDaysLeft: workingDaysBetween(DEMO_TODAY, k.date, cc),
      ...(fallback ? { calendarFallback: true } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Reminders (the Workbench rule): 3 days and 1 day before, to the owner and the
// Bid Manager; escalation to the Head of Tendering 24 h before an unmet deadline.

export interface Reminder { at: string; kind: 'reminder' | 'escalation'; toIds: string[]; text: string }

/** Planned reminders still ahead of the demo clock. Nothing is sent. */
export function remindersFor(row: KeyDateRow): Reminder[] {
  if (row.past || !DEADLINES.has(row.kind)) return [];
  const t = tenderOf(row.tenant, row.tenderId);
  const owner = firstWithRole(row.tenant, 'coord')?.id;
  const head = firstWithRole(row.tenant, 'hot')?.id;
  const to = [owner, t?.bidManagerId].filter((x): x is string => !!x);
  const time = row.time ?? '09:00';
  const deadline = `${row.date}T${row.time ?? '23:59'}`;
  const plan: Reminder[] = [
    { at: `${addDays(row.date, -3)}T${time}`, kind: 'reminder', toIds: to, text: `${row.label} in 3 days: ${shortDate(row.date)}` },
    { at: `${addDays(row.date, -1)}T${time}`, kind: 'reminder', toIds: to, text: `${row.label} tomorrow: ${shortDate(row.date)}` },
    ...(head ? [{ at: addHours(deadline, -24), kind: 'escalation' as const, toIds: [head], text: `${row.label} is 24 h away and not yet met: escalated to the Head of Tendering` }] : []),
  ];
  return plan.filter((r) => r.at >= DEMO_NOW);
}

// ---------------------------------------------------------------------------
// Preparation time against the typical time for this type (SCR-8)

export interface PrepRatio { workingDaysLeft: number; typical: number; n: number; ratio: number; tone: Tone; basis: string }

const family = (s: string) => s.toLowerCase().split(/[\s,]+/)[0];

/** Working days to submission ÷ the tenant's typical preparation time. Red below 1.0, orange below 1.3. */
export function prepRatio(tenant: string, tenderId: string): PrepRatio | null {
  const t = tenderOf(tenant, tenderId);
  const sub = t && keyDate(t, 'submission');
  if (!t || !sub || sub.date < DEMO_TODAY) return null;
  const prep = s1Data(tenant).prep;
  // This sector, then the same sector family, then the tenant's lead sector, then the largest sample of this type.
  const lead = profileOf(tenant).sectors[0] ?? '';
  const typical = prep.find((p) => p.procurement === t.procurement && p.sector === t.sector)
    ?? prep.find((p) => p.procurement === t.procurement && family(p.sector) === family(t.sector))
    ?? prep.find((p) => p.procurement === t.procurement && family(p.sector) === family(lead))
    ?? prep.filter((p) => p.procurement === t.procurement).sort((a, b) => b.n - a.n)[0];
  if (!typical) return null;
  const { cc } = authorityCalendar(t, tenant);
  const workingDaysLeft = workingDaysBetween(DEMO_TODAY, sub.date, cc);
  const ratio = Math.round((workingDaysLeft / typical.workingDays) * 100) / 100;
  const tone: Tone = ratio < 1 ? 'red' : ratio < 1.3 ? 'orange' : 'green';
  return {
    workingDaysLeft, typical: typical.workingDays, n: typical.n, ratio, tone,
    basis: `Typical for ${typical.procurement === 'two-file' ? 'two-file' : typical.procurement} ${typical.sector.toLowerCase()} tenders: ${typical.workingDays} working days (${typical.n} past bids)`,
  };
}
