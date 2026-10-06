import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { firstWithRole, peopleOf } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { TENANTS } from '@/data/tenants';
import { addDays, isWorkingDay } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { calendarInvite, contactFor, emailOf, hoursOn, nextSlot, teamsCallUrl, teamsChatUrl, utcOf } from '@/domain/gcc/contact';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 044: the contact links. Every person's address is on a `.example`
 * domain, ASCII and their own; the Teams links are well formed; the invite is
 * one VEVENT from the viewer to the contact, at a working half hour after the
 * demo clock in this company's week. Nothing here writes demo state.
 */

interface Check { name: string; ok: boolean; got: string }

/** True when a tenant-local `YYYY-MM-DDTHH:MM` is a working half hour that fits a 30-minute call. */
function isWorkingSlot(local: string, tenant: string): boolean {
  const cc = TENANTS.find((t) => t.key === tenant)?.countryCode ?? 'SA';
  const d = local.slice(0, 10);
  const t = local.slice(11, 16);
  const h = hoursOn(d, cc);
  const [hh, mm] = t.split(':').map(Number);
  const end = `${String(hh + Math.floor((mm + 30) / 60)).padStart(2, '0')}:${String((mm + 30) % 60).padStart(2, '0')}`;
  return isWorkingDay(d, cc) && mm % 30 === 0 && t >= h.from && end <= h.to;
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const people = peopleOf(tenant);
  const hot = firstWithRole(tenant, 'hot')!;
  const cfo = people.find((p) => p.seat === 'cfo') ?? people[1];

  // 1. Every address is ASCII, first.last, on .example, and nobody shares one.
  const emails = people.map((p) => emailOf(p, tenant));
  const bad = emails.filter((e) => !/^[a-z0-9]+(\.[a-z0-9]+)?@[a-z0-9-]+(\.[a-z0-9-]+)*\.example$/.test(e));
  const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
  add('Every person: an ASCII address on .example, one each', !bad.length && !dupes.length,
    `${emails.length} addresses · e.g. ${emails[0]}, ${emailOf(cfo, tenant)}${bad.length ? ` · bad: ${bad.join(', ')}` : ''}${dupes.length ? ` · shared: ${dupes.join(', ')}` : ''}`);

  // 2. The Teams chat link carries the address and the message.
  const email = emailOf(cfo, tenant);
  const msg = 'Re T-2026-097 DG2: your position (CFO)';
  const chat = new URL(teamsChatUrl(email, msg));
  add('Teams chat link is well formed', chat.protocol === 'https:' && chat.host === 'teams.microsoft.com' && chat.pathname === '/l/chat/0/0' && chat.searchParams.get('users') === email && chat.searchParams.get('message') === msg,
    chat.href.slice(0, 110));

  // 3. The Teams call link.
  const call = new URL(teamsCallUrl(email));
  add('Teams call link is well formed', call.host === 'teams.microsoft.com' && call.pathname === '/l/call/0/0' && call.searchParams.get('users') === email, call.href);

  // 4. The invite: one VEVENT, a request from the Head of Tendering to the contact, at the next working half hour.
  const c = contactFor(tenant, hot, cfo, msg);
  // Read unfolded: a long line continues on the next one after a space.
  const ics = c.ics().replace(/\r\n /g, '');
  const tz = TENANTS.find((t) => t.key === tenant)?.timeZone ?? '';
  const start = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)?.[1] ?? '';
  const startMs = Date.parse(start.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
  const vevents = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  const okIcs = vevents === 1 && /METHOD:REQUEST/.test(ics) && ics.includes(`ORGANIZER;CN=${hot.name}:mailto:${emailOf(hot, tenant)}`)
    && ics.includes(`:mailto:${email}`) && startMs === utcOf(c.slot, tz) && c.slot > DEMO_NOW && isWorkingSlot(c.slot, tenant);
  add('Invite: one VEVENT, organiser to contact, at a working half hour after the demo clock', okIcs,
    `${vevents} VEVENT · slot ${c.slotText} (${start}) · ${ics.length} bytes`);

  // 5. The slot is a working half hour from any time of the week, never a weekend or a holiday.
  const starts = Array.from({ length: 14 }, (_, i) => `${addDays(DEMO_NOW.slice(0, 10), i)}T${['07:10', '10:00', '13:45', '16:50'][i % 4]}`);
  const slots = starts.map((s) => ({ s, slot: nextSlot(tenant, s) }));
  const off = slots.filter((x) => !(x.slot > x.s) || !isWorkingSlot(x.slot, tenant));
  add('Next slot from 14 times across two weeks: always a working half hour, later', !off.length,
    off.length ? off.map((x) => `${x.s} → ${x.slot}`).join(' · ') : `e.g. ${slots[3].s} → ${slots[3].slot}; ${slots[5].s} → ${slots[5].slot}`);

  // 6. A generic invite folds long lines and escapes text.
  const long = calendarInvite({ from: { name: hot.name, email: emailOf(hot, tenant) }, to: { name: cfo.name, email }, subject: `A, b; c ${'x'.repeat(90)}`, body: 'one\ntwo', start: c.slot, minutes: 30, tz });
  const lines = long.split('\r\n');
  add('Invite lines fold at 75 and text is escaped', lines.every((l) => l.length <= 75) && long.includes('SUMMARY:A\\, b\\; c') && long.includes('one\\ntwo'),
    `${lines.length} lines · longest ${Math.max(...lines.map((l) => l.length))}`);

  return out;
}

export default function ContactCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Contact links (plan 044)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Contact links (plan 044)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
