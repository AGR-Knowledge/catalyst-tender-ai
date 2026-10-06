import type { Person } from '@/data/people';
import { TENANTS, type CountryCode } from '@/data/tenants';
import { CALENDARS } from '@/data/gcc/calendar';
import { EMAIL_DOMAIN, EMAIL_OVERRIDES, FALLBACK_DOMAIN, MEETING, OFFICE_HOURS, PLATFORM_DOMAIN } from '@/data/gcc/contacts';
import { addDays, dateText, isWorkingDay } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';

/**
 * Contact links (plan 044): real Teams deep links and a real calendar invite,
 * addressed to `.example` mailboxes so nothing reaches a real person. Nothing
 * here writes demo state. Addresses come from each person's current name.
 */

/** "Eng. Abdulaziz Al-Dosari" → ["abdulaziz", "aldosari"]: honorifics dropped, ASCII only, the "Al-" article kept with the surname. */
function nameParts(name: string): string[] {
  const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = ascii.replace(/^(Eng\.?|Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').trim().split(/\s+/).filter(Boolean);
  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (words.length <= 1) return [clean(words[0] ?? '')].filter(Boolean);
  return [clean(words[0]), clean(words.slice(1).join(''))].filter(Boolean);
}

/** The firm in an external contact's title ("Supplier, Gulf Process Systems Co.") as a domain label. */
function firmDomain(title: string): string | null {
  const firm = title.includes(',') ? title.slice(title.indexOf(',') + 1) : '';
  const label = firm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(co|llc|ltd|wll|w\.l\.l|inc|plc)\b\.?/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return label ? `${label}.example` : null;
}

/** The mail domain for a person: their company's, the platform's, or (for an external contact) their firm's. */
function domainOf(person: Person, tenant: string): string {
  if (person.tenant === '*') return PLATFORM_DOMAIN;
  if (person.group === 'External') return firmDomain(person.title) ?? FALLBACK_DOMAIN;
  return EMAIL_DOMAIN[person.tenant] ?? EMAIL_DOMAIN[tenant] ?? FALLBACK_DOMAIN;
}

/** `first.last@company.example`, lower case and ASCII, from the person's current name. */
export function emailOf(person: Person, tenant: string): string {
  const override = EMAIL_OVERRIDES[person.id];
  if (override) return override;
  const local = nameParts(person.name).join('.') || person.id.replace(/[^a-z0-9.]/gi, '').toLowerCase();
  return `${local}@${domainOf(person, tenant)}`;
}

const TEAMS = 'https://teams.microsoft.com/l';

/** A Teams chat with one person, the first message filled in. */
export const teamsChatUrl = (email: string, message: string) => `${TEAMS}/chat/0/0?users=${email}&message=${encodeURIComponent(message)}`;

/** A Teams call to one person. */
export const teamsCallUrl = (email: string) => `${TEAMS}/call/0/0?users=${email}`;

/** "Re T-2026-097 DG2: your position (CFO)". */
export const contactSubject = (tenderId: string, gate: string, about: string) => `Re ${tenderId} ${gate}: ${about}`;

/* ------------------------------------------------------------ the slot */

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** The working hours on a day: the country's Ramadan hours inside Ramadan, office hours otherwise. */
export function hoursOn(iso: string, cc: CountryCode): { from: string; to: string } {
  const r = CALENDARS[cc].ramadan;
  if (r && iso >= r.from && iso <= r.to) {
    const [from, to] = r.hours.split(/\s*[–-]\s*/);
    if (from && to) return { from, to };
  }
  return { ...OFFICE_HOURS };
}

const tenantOf = (key: string) => TENANTS.find((t) => t.key === key);

/**
 * The next working half-hour slot after `now` (tenant-local `YYYY-MM-DDTHH:MM`),
 * on a working day of the tenant's week, that ends inside that day's hours.
 */
export function nextSlot(tenant: string, now: string = DEMO_NOW, minutes: number = MEETING.minutes): string {
  const cc = tenantOf(tenant)?.countryCode ?? 'SA';
  const step = MEETING.stepMinutes;
  const today = now.slice(0, 10);
  const nowMin = minutesOf(now.slice(11, 16) || '00:00');
  for (let i = 0, d = today; i < 60; i++, d = addDays(d, 1)) {
    if (!isWorkingDay(d, cc)) continue;
    const h = hoursOn(d, cc);
    const open = minutesOf(h.from);
    const close = minutesOf(h.to);
    const after = d === today ? (Math.floor(nowMin / step) + 1) * step : 0;
    const start = Math.max(open, Math.ceil(after / step) * step);
    if (start + minutes <= close) return `${d}T${hhmm(start)}`;
  }
  return now.slice(0, 16);
}

/** "Sun 8 Mar 2026, 10:30 AST". */
export function slotText(local: string, tenant: string): string {
  const tz = tenantOf(tenant)?.tzLabel;
  return `${dateText(local.slice(0, 10))}, ${local.slice(11, 16)}${tz ? ` ${tz}` : ''}`;
}

/* ------------------------------------------------------------ the invite */

/** A tenant-local wall-clock time in an IANA zone, as epoch milliseconds. */
export function utcOf(local: string, timeZone: string): number {
  const [y, mo, d] = local.slice(0, 10).split('-').map(Number);
  const [h, mi] = (local.slice(11, 16) || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return guess - (wall - guess);
}

/** `20260308T073000Z`. */
const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** RFC 5545 text: backslash, semicolon, comma and new lines escaped. */
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters fold onto continuation lines that start with a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) out.push(` ${line.slice(i, i + 74)}`);
  return out.join('\r\n');
}

export interface InviteParty { name: string; email: string }

export interface InviteInput {
  /** The viewer: the organiser. */
  from: InviteParty;
  /** The contact: the one attendee. */
  to: InviteParty;
  subject: string;
  body: string;
  /** Tenant-local `YYYY-MM-DDTHH:MM`. */
  start: string;
  minutes: number;
  /** IANA zone of the tenant, e.g. `Asia/Riyadh`. */
  tz: string;
  /** Tenant-local `YYYY-MM-DDTHH:MM` the invite is made at (the demo clock). */
  stamp?: string;
}

/** An `.ics` file (`text/calendar`, METHOD:REQUEST) with one VEVENT, in UTC. */
export function calendarInvite(i: InviteInput): string {
  const startMs = utcOf(i.start, i.tz);
  const endMs = startMs + i.minutes * 60_000;
  const stampMs = utcOf(i.stamp ?? DEMO_NOW, i.tz);
  const uid = `${icsStamp(startMs)}-${i.to.email.replace(/[^a-z0-9]/gi, '')}-${i.subject.replace(/[^a-z0-9]/gi, '').slice(0, 24)}@catalyst-tender-ai.example`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AGR//Catalyst Tender AI demo//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(stampMs)}`,
    `DTSTART:${icsStamp(startMs)}`,
    `DTEND:${icsStamp(endMs)}`,
    `SUMMARY:${icsText(i.subject)}`,
    `DESCRIPTION:${icsText(i.body)}`,
    `ORGANIZER;CN=${icsText(i.from.name)}:mailto:${i.from.email}`,
    `ATTENDEE;CN=${icsText(i.to.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${i.to.email}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Everything one contact's three links need, for a viewer in a tenant. */
export interface ContactVM {
  email: string;
  chatUrl: string;
  callUrl: string;
  /** Tenant-local start of the invite's slot. */
  slot: string;
  slotText: string;
  /** The `.ics` text, made on demand. */
  ics(): string;
  fileName: string;
}

export function contactFor(tenant: string, viewer: Person, person: Person, subject: string, now: string = DEMO_NOW): ContactVM {
  const email = emailOf(person, tenant);
  const slot = nextSlot(tenant, now);
  const tz = tenantOf(tenant)?.timeZone ?? 'Asia/Riyadh';
  const body = `${subject}.\n\nA ${MEETING.minutes}-minute call with ${person.name}, booked from Catalyst Tender AI by ${viewer.name}.`;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    email,
    chatUrl: teamsChatUrl(email, subject),
    callUrl: teamsCallUrl(email),
    slot,
    slotText: slotText(slot, tenant),
    ics: () => calendarInvite({
      from: { name: viewer.name, email: emailOf(viewer, tenant) }, to: { name: person.name, email },
      subject, body, start: slot, minutes: MEETING.minutes, tz, stamp: now,
    }),
    fileName: `${slug(subject.replace(/^Re /, '')).slice(0, 48)}-${slug(person.name)}.ics`,
  };
}
