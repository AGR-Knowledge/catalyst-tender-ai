import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { can } from '@/data/access';
import { committeeOf, firstWithRole, peopleOf, type Person } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { DEMO_TODAY, addDays, weekdayOf, weekendText } from '@/domain/calendar';
import { dataPort } from '@/domain/gcc/port';
import { queriesFor } from '@/domain/gcc/lifecycle';
import { keyDatesFor } from '@/domain/gcc/s1';
import { rfqsFor, sentBy } from '@/domain/gcc/s2';
import { vaultFor } from '@/domain/gcc/company/vault';
import {
  CALENDAR_CATEGORIES, LEAD_DAYS, byImportance, calendarBanners, calendarDay, calendarItemDetail, calendarItems, calendarLeadUps, ccOf, firstWeekday, hasLeadUp,
  leadDays, leadDaysLeft, monthGrid, weekStart, weekendDays, type CalendarItemVM,
} from '@/domain/gcc/calendar';
import { plural, profileOf, shortDate } from '@/domain/gcc/s1/common';
import { isWorkingDay } from '@/domain/calendar';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 027b: the calendar reads the same dates as the modules that hold them
 * (key dates, gate dues, RFQ reply dates, the credentials vault), hides what
 * the viewer may not see, and shades each country's weekend. In the active
 * tenant, as its Head of Tendering and three other people, over the next
 * eight weeks, on the seed (`done` is an empty map in memory), so it changes nothing.
 * Orchestrator follow-up (2026-09-28): weeks start on the country's first
 * working day, quotes are one item per tender and day, and a day lists its
 * items most important first.
 * Plan 041: lead-ups on the 3 working days before every decision or action,
 * in the item's country, from today on; none for information-only dates.
 */

interface Check { name: string; ok: boolean; got: string }

const DONE: Record<string, string> = {};
const FROM = DEMO_TODAY;
const TO = addDays(DEMO_TODAY, 8 * 7 - 1);
const when = (date: string, time?: string) => (time ? `${date}T${time}` : date);

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const hot = firstWithRole(tenant, 'hot')!;
  const itemsOf = (viewer: Person) => calendarItems({ tenant, viewer, done: DONE, from: FROM, to: TO });
  const items = itemsOf(hot);
  const rows = dataPort()?.rows(tenant, { kind: 'all' }, hot, 'live', DONE) ?? [];
  const byId = new Map(items.map((i) => [i.id, i]));

  // 1. Every future key date of every visible live tender appears once, at its date, time and zone.
  const kds = rows.flatMap((r) => keyDatesFor(tenant, r.id, DONE).filter((k) => k.kind !== 'published' && !k.past && k.date <= TO));
  const kdMiss = kds.filter((k) => {
    const hits = items.filter((i) => i.id === `kd:${k.tenderId}:${k.kind}:${k.date}`);
    return hits.length !== 1 || when(hits[0].date, hits[0].time) !== when(k.date, k.time) || hits[0].tz !== k.tz;
  });
  const kdExtra = items.filter((i) => i.ref.kind === 'key-date' && !i.past).length - kds.length;
  add('Key dates: each future one appears once, at its date, time and zone', !kdMiss.length && kdExtra === 0,
    `${kds.length} key dates · ${kdMiss.length ? `missing or moved: ${kdMiss.slice(0, 3).map((k) => `${k.tenderId} ${k.kind}`).join(', ')}` : 'none missing'} · ${kdExtra} extra`);

  // 2. Every gate item is its row's next gate due.
  const gates = rows.filter((r) => r.nextGate?.slaEnd && r.nextGate.slaEnd.slice(0, 10) <= TO && r.nextGate.slaEnd.slice(0, 10) >= FROM);
  const gateMiss = gates.filter((r) => { const i = byId.get(`gate:${r.id}:${r.nextGate!.gate}`); return !i || when(i.date, i.time) !== r.nextGate!.slaEnd; });
  const gateItems = items.filter((i) => i.category === 'gates');
  add('Decision gates: each is the row’s next gate due', !gateMiss.length && gateItems.length === gates.length,
    `${gateItems.length} of ${gates.length} gates${gateMiss.length ? ` · off: ${gateMiss.map((r) => r.id).join(', ')}` : ''}`);

  // 3. Every quotes item gathers its tender's replies due that day, at the earliest one, and counts them.
  const quotes = items.filter((i) => i.ref.kind === 'quotes');
  const sentIn = rows.flatMap((r) => rfqsFor(tenant, r.id, DONE).filter((x) => sentBy(x) && x.replyBy.slice(0, 10) >= FROM && x.replyBy.slice(0, 10) <= TO));
  const quoteMiss = quotes.filter((i) => {
    if (i.ref.kind !== 'quotes') return true;
    const rs = rfqsFor(tenant, i.ref.tenderId, DONE).filter((r) => sentBy(r) && r.replyBy.slice(0, 10) === i.date);
    const first = rs.map((r) => r.replyBy).sort()[0];
    const replied = rs.filter((r) => r.repliedAt).length;
    const held = i.ref.packages.flatMap((p) => p.rfqIds).length;
    const d = calendarItemDetail(i.id, { tenant, viewer: hot, done: DONE });
    return first !== when(i.date, i.time) || rs.length !== held || !d?.needs[0]?.text.startsWith(`${replied} of ${rs.length} `);
  });
  const held = quotes.reduce((n, i) => n + (i.ref.kind === 'quotes' ? i.ref.packages.flatMap((p) => p.rfqIds).length : 0), 0);
  const perDay = new Set(quotes.map((i) => `${i.tenderId}|${i.date}`)).size;
  add('Supplier quotes: one item per tender and day, earliest reply, replied count', !quoteMiss.length && held === sentIn.length && perDay === quotes.length,
    `${quotes.length} items for ${sentIn.length} replies due${quoteMiss.length ? ` · off: ${quoteMiss.map((i) => i.id).join(', ')}` : ', all agree'}`);

  // 4. Every credential expiry is the vault's valid-to date.
  const vault = vaultFor(tenant, DONE, hot).rows.filter((c) => c.validTo && c.validTo >= FROM && c.validTo <= TO);
  const credMiss = vault.filter((c) => byId.get(`cred:${c.id}:expiry`)?.date !== c.validTo);
  const credItems = items.filter((i) => i.ref.kind === 'credential' && i.ref.what === 'expiry');
  add('Credentials: each expiry is the vault’s valid-to date', !credMiss.length && credItems.length === vault.length,
    `${credItems.length} of ${vault.length} expiries${credMiss.length ? ` · off: ${credMiss.map((c) => c.id).join(', ')}` : ''}`);

  // 5. A committee member (no sourcing.view) gets no supplier quotes.
  const member = committeeOf(tenant).find((p) => p.role === 'member');
  const memberQuotes = member ? itemsOf(member).filter((i) => i.category === 'quotes').length : -1;
  add('A committee member gets no supplier quotes', !!member && !can(member, 'sourcing.view').ok && memberQuotes === 0,
    member ? `${member.name}: ${memberQuotes} quotes items` : 'no committee member');

  // 6. Someone without company.view gets no credential items.
  const noCompany = peopleOf(tenant).find((p) => p.switcher && can(p, 'tender.view').ok && !can(p, 'company.view').ok);
  const noCompanyCreds = noCompany ? itemsOf(noCompany).filter((i) => i.ref.kind === 'credential').length : -1;
  add('Without company.view, no credential items', !!noCompany && noCompanyCreds === 0,
    noCompany ? `${noCompany.name} (${noCompany.title}): ${noCompanyCreds} credential items` : 'nobody without company.view');

  // 7. No item belongs to a tender the viewer can't open: restricted tenders, as someone not cleared.
  const hq = queriesFor({ tenant, viewer: hot, done: DONE });
  const restricted = new Set(rows.filter((r) => hq.one(r.id)?.restricted).map((r) => r.id));
  const outsider = peopleOf(tenant).find((p) => p.switcher && can(p, 'tender.view').ok && !(can(p, 'see.restricted').ok && p.cleared));
  const oq = outsider ? queriesFor({ tenant, viewer: outsider, done: DONE }) : null;
  const leaks = outsider ? itemsOf(outsider).filter((i) => i.tenderId && (restricted.has(i.tenderId) || !oq!.one(i.tenderId))) : [];
  add('No item on a tender the viewer can’t open (restricted, not cleared)', !!outsider && !leaks.length,
    outsider ? `${outsider.name}: ${restricted.size} restricted ${restricted.size === 1 ? 'tender' : 'tenders'} hidden · ${leaks.length} items on them` : 'nobody to check');

  // 8. Weekends per country, as the month grid shades them.
  const sa = weekendDays('SA');
  const ae = weekendDays('AE');
  add('Weekends: KSA Fri–Sat, UAE Sat–Sun', sa.join() === '5,6' && [...ae].sort().join() === '0,6',
    `KSA ${weekendText('SA')} (${sa.join(', ')}) · UAE ${weekendText('AE')} (${ae.join(', ')})`);

  // 9. Sorted by date, then time, untimed last in a day.
  const key = (i: CalendarItemVM) => `${i.date}T${i.time ?? '99:99'}`;
  const unsorted = items.findIndex((i, n) => n > 0 && key(items[n - 1]) > key(i));
  add('Sorted by date, then time, untimed last', unsorted < 0, unsorted < 0 ? `${items.length} items in order` : `out of order at ${items[unsorted].id}`);

  // 10. Stable, unique ids.
  add('Every id is unique', byId.size === items.length, `${items.length} items · ${byId.size} ids`);

  // 11. One item of each category opens a detail, with this item marked among the tender's dates and "Open tender" first.
  const samples = CALENDAR_CATEGORIES.map((c) => items.find((i) => i.category === c.key)).filter((i): i is CalendarItemVM => !!i);
  const bad = samples.filter((i) => {
    const d = calendarItemDetail(i.id, { tenant, viewer: hot, done: DONE });
    if (!d || !d.actions.length) return true;
    return !!i.tenderId && (d.otherDates.filter((o) => o.current).length !== 1 || d.actions[0].label !== 'Open tender');
  });
  add('Each category’s item opens a detail with its actions', !bad.length,
    `${samples.length} categories sampled${bad.length ? ` · failing: ${bad.map((i) => i.id).join(', ')}` : ''}`);

  // 12. Only mine: the Head of Tendering decides every DG2 and DG3 due.
  const approvals = gateItems.filter((i) => i.ref.kind === 'gate' && i.ref.gate !== 'DG1');
  add('Only mine: every DG2 and DG3 due is the Head of Tendering’s', approvals.every((i) => i.mine),
    `${approvals.filter((i) => i.mine).length} of ${approvals.length} marked mine`);

  // 13. Weeks start on the first working day: Sunday in KSA, Monday in the UAE, and the tenant's own after its weekend.
  const cc = profileOf(tenant).countryCode;
  const start = weekStart(DEMO_TODAY, cc);
  const own = weekendDays(cc);
  add('Weeks start on the first working day (KSA Sunday, UAE Monday)',
    firstWeekday('SA') === 0 && firstWeekday('AE') === 1 && !own.includes(weekdayOf(start)) && own.includes(weekdayOf(addDays(start, -1))),
    `KSA ${firstWeekday('SA')} · UAE ${firstWeekday('AE')} · this week from ${start}`);

  // 14. The month grid holds the whole month in the weeks it needs.
  const mSa = monthGrid('2026-03-01', 'SA');
  const mAe = monthGrid('2026-03-01', 'AE');
  const g = monthGrid(DEMO_TODAY.slice(0, 7) + '-01', cc);
  add('Month grid: March 2026 is 5 weeks from Sun 1 Mar in KSA, 6 from Mon 23 Feb in the UAE',
    mSa.from === '2026-03-01' && mSa.weeks === 5 && mAe.from === '2026-02-23' && mAe.weeks === 6 && g.from <= DEMO_TODAY.slice(0, 7) + '-01' && g.to >= '2026-03-31',
    `KSA ${mSa.from} × ${mSa.weeks} · UAE ${mAe.from} × ${mAe.weeks} · here ${g.from} to ${g.to}`);

  // 15. A day lists its most important item first: its category leads the legend order among that day's.
  const rank = (i: CalendarItemVM) => CALENDAR_CATEGORIES.findIndex((c) => c.key === i.category);
  const days = [...new Set(items.map((i) => i.date))];
  const misordered = days.filter((day) => {
    const list = byImportance(items.filter((i) => i.date === day));
    return list.some((i, n) => n > 0 && (rank(list[n - 1]) > rank(i) || (rank(list[n - 1]) === rank(i) && !list[n - 1].flags.length && i.flags.length > 0)));
  });
  add('A day lists the most important first (category, then flagged)', !misordered.length,
    `${days.length} days${misordered.length ? ` · out of order: ${misordered.slice(0, 3).join(', ')}` : ', all in order'}`);

  // 16. The day's list holds every item of that day once.
  const short = days.filter((day) => calendarDay(day, items, tenant).groups.reduce((n, x) => n + x.rows.length, 0) !== items.filter((i) => i.date === day).length);
  add('The whole day lists each of its items once', !short.length, `${days.length} days${short.length ? ` · off: ${short.slice(0, 3).join(', ')}` : ', all complete'}`);

  // 17. Ramadan and the closures share one banner row: none overlaps another.
  const bs = calendarBanners(cc, '2026-01-01', '2026-12-31');
  const clash = bs.filter((a, n) => bs.some((b, m) => m > n && a.from <= b.to && b.from <= a.to));
  add('Banners share one row: none overlaps another', !clash.length, `${bs.length} banners${clash.length ? ` · overlapping: ${clash.map((b) => b.key).join(', ')}` : ''}`);

  // 18–25. Lead-ups (plan 041), as the Head of Tendering.
  const leads = calendarLeadUps({ tenant, viewer: hot, done: DONE, from: FROM, to: TO });
  const dueAll = calendarItems({ tenant, viewer: hot, done: DONE, from: addDays(FROM, 1), to: TO });
  const leadsOf = (id: string) => leads.filter((l) => l.lead?.dueId === id).map((l) => l.date);
  const expected = (i: CalendarItemVM) => leadDays(i.date, ccOf(i, tenant)).filter((x) => x >= DEMO_TODAY);
  const actions = dueAll.filter((i) => !i.past && hasLeadUp(i));
  const leadOff = actions.filter((i) => leadsOf(i.id).join() !== expected(i).join());
  const orphan = leads.filter((l) => !actions.some((i) => i.id === l.lead?.dueId) && l.lead!.due <= TO);
  add('Lead-ups: every decision or action due shows on its 3 working days before, from today on', !leadOff.length && !orphan.length,
    `${actions.length} items · ${leads.length} lead-up days${leadOff.length ? ` · off: ${leadOff.slice(0, 3).map((i) => i.id).join(', ')}` : ''}${orphan.length ? ` · ${orphan.length} without a due item` : ''}`);

  const info = dueAll.filter((i) => !hasLeadUp(i));
  const infoKinds = [...new Set(info.map((i) => (i.ref.kind === 'key-date' ? i.ref.keyDate : i.ref.kind)))];
  const infoLeads = info.filter((i) => leadsOf(i.id).length).length;
  const wrongKind = info.filter((i) => i.ref.kind !== 'quotes' && !(i.ref.kind === 'key-date' && ['opening', 'answers', 'site-visit', 'pre-bid', 'validity-end', 'bond-validity-end'].includes(i.ref.keyDate)));
  add('Information-only dates get no lead-up (bid opening, answers, meetings, quotes, validity)', !infoLeads && !wrongKind.length,
    `${info.length} items (${infoKinds.join(', ') || 'none'}) · ${infoLeads} with lead-ups`);

  // Three samples: a gate, a submission, a renewal or expiry, over a year. Prefer one whose 3 lead days are all from today.
  const FAR = addDays(FROM, 52 * 7);
  const farLeads = calendarLeadUps({ tenant, viewer: hot, done: DONE, from: FROM, to: FAR });
  const farActions = calendarItems({ tenant, viewer: hot, done: DONE, from: addDays(FROM, 1), to: FAR }).filter((i) => !i.past && hasLeadUp(i));
  const sample = (pick: (i: CalendarItemVM) => boolean) => {
    const xs = farActions.filter(pick);
    return xs.find((i) => expected(i).length === LEAD_DAYS) ?? xs[0];
  };
  const sampleRow = (name: string, i: CalendarItemVM | undefined) => {
    if (!i) { add(name, true, 'none due in the next 12 months: nothing to sample'); return; }
    const cc = ccOf(i, tenant);
    const got = farLeads.filter((l) => l.lead?.dueId === i.id).map((l) => l.date);
    const want = expected(i);
    const counts = got.map((x) => leadDaysLeft(x, i.date, cc));
    // An item due so soon that its lead days have all passed has none, rightly.
    const ok = got.join() === want.join() && got.every((x) => isWorkingDay(x, cc) && x >= DEMO_TODAY && x < i.date)
      && counts.join() === counts.map((_, n) => counts.length - n).join();
    add(name, ok, `${i.chip}${i.tenderId ? ` ${i.tenderId}` : ''} due ${shortDate(i.date)} (${cc}): ${got.length ? `${got.map((x) => shortDate(x)).join(', ')} · ${counts.join(', ')} working days left` : `none: its ${LEAD_DAYS} working days before (${leadDays(i.date, cc).map((x) => shortDate(x)).join(', ')}) are before today`}`);
  };
  sampleRow('Sample: a decision gate shows on the working days before it', sample((i) => i.category === 'gates'));
  sampleRow('Sample: a submission shows on the working days before it', sample((i) => i.ref.kind === 'key-date' && i.ref.keyDate === 'submission' || i.ref.kind === 'submission'));
  sampleRow('Sample: a renewal or expiry shows on the working days before it', sample((i) => i.ref.kind === 'credential' && i.ref.what === 'renewal') ?? sample((i) => i.ref.kind === 'credential'));

  // The country week and a holiday, whatever the tenant: due Mon 16 Mar skips Fri–Sat in KSA and Sat–Sun in the UAE; due Sun 29 Mar in KSA skips Eid (19–28 Mar).
  const sa16 = leadDays('2026-03-16', 'SA').join();
  const ae16 = leadDays('2026-03-16', 'AE').join();
  const sa29 = leadDays('2026-03-29', 'SA').join();
  add('Working days follow the country: KSA skips Fri–Sat, the UAE Sat–Sun, both skip a closure',
    sa16 === '2026-03-11,2026-03-12,2026-03-15' && ae16 === '2026-03-11,2026-03-12,2026-03-13' && sa29 === '2026-03-16,2026-03-17,2026-03-18',
    `KSA before Mon 16 Mar: ${sa16} · UAE: ${ae16} · KSA before Sun 29 Mar (Eid): ${sa29}`);

  // Never before today or on the due day; a day lists every due item before its lead-ups.
  const early = leads.filter((l) => l.date < DEMO_TODAY || l.date >= l.lead!.due);
  const merged = [...items, ...leads];
  const leadFirst = [...new Set(leads.map((l) => l.date))].filter((day) => {
    const list = byImportance(merged.filter((i) => i.date === day));
    const firstLead = list.findIndex((i) => i.lead);
    return firstLead >= 0 && list.slice(firstLead).some((i) => !i.lead);
  });
  add('Lead-ups: never before today or on the due day; due items come first in a day', !early.length && !leadFirst.length,
    `${leads.length} lead-up days${early.length ? ` · out of range: ${early.slice(0, 3).map((l) => l.id).join(', ')}` : ''}${leadFirst.length ? ` · lead-up before a due item on ${leadFirst.slice(0, 3).join(', ')}` : ', due items first'}`);

  // Lead-ups only for what the viewer may see: the Bid Manager and someone not cleared for restricted tenders.
  const bm = firstWithRole(tenant, 'bid');
  const seen = [bm, outsider].filter((p): p is Person => !!p).map((p) => {
    const own = new Set(calendarItems({ tenant, viewer: p, done: DONE, from: FROM, to: addDays(TO, 30) }).map((i) => i.id));
    const ls = calendarLeadUps({ tenant, viewer: p, done: DONE, from: FROM, to: TO });
    return { p, n: ls.length, stray: ls.filter((l) => !own.has(l.lead!.dueId) || (l.tenderId && restricted.has(l.tenderId) && p === outsider)).length };
  });
  add('Lead-ups only for items the viewer may see (Bid Manager, not cleared)', seen.length === 2 && seen.every((x) => !x.stray),
    seen.map((x) => `${x.p.name}: ${x.n} lead-up days, ${x.stray} stray`).join(' · '));

  // A lead-up opens the due item's own detail, with how far off it is.
  const l0 = leads[0];
  const d0 = l0 ? calendarItemDetail(l0.id, { tenant, viewer: hot, done: DONE }) : null;
  const n0 = l0 ? leadDaysLeft(l0.date, l0.lead!.due, ccOf(l0, tenant)) : 0;
  add('A lead-up opens its due item, with “Due …, in N working days”',
    !!d0 && d0.item.id === l0.lead!.dueId && d0.lead === `Due ${shortDate(l0.lead!.due)}, in ${plural(n0, 'working day')}`,
    d0 ? `${l0.chip} on ${shortDate(l0.date)} → ${d0.item.title} · “${d0.lead}”` : 'no lead-up to open');

  return out;
}

export default function CalendarCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Calendar (plan 027b)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Calendar (plans 027b and 041)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
