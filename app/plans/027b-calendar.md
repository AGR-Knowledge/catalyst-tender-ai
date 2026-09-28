# 027b — The calendar, like Outlook: month, week and agenda, and a detail modal for every item

Status: DONE (2026-09-28, reviewed) · Depends on: wave 8 (commit 10de455) · Can run in parallel with: 027a, 027c, 027d

## Goal
A Head of Tendering opens Calendar and sees March 2026 as a month grid, as in Outlook:
- every submission, site visit, questions deadline, gate decision, supplier quote due date and credential renewal sits on its day, in a colour that says what kind of item it is;
- the authority's weekend is shaded and the Eid closures show as all-day banners;
- today (Sun 8 Mar) is marked.

They switch to a week view with a time grid, or to the agenda list the page shows today. Clicking any item opens a modal with everything about it: when in the authority's time zone and how many working days are left, where, the tender and who owns it, what is still needed, the tender's other dates, and buttons to go and act.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Build what the prospect sees and clicks.** No new facts, rules, capabilities or libraries. Every item is read from the modules that already hold it (listed under Context), so the calendar never disagrees with the Key dates tab, the tracker, the credentials vault or the package board.
- **Read only.** The calendar records nothing. No new `done` keys; Reset is unaffected. The chosen view (month, week, agenda) is a per-viewer convenience in `localStorage`, in try/catch.
- **Keep dev checks small:** one new file, `dev-checks/78-calendar.tsx`, with 8 to 12 rows.
- **Keep other readings still.** All `/dev/checks` rows that exist today must still pass in the five tenants (after wave 8: Najd 805, Corniche 396, Dafna 377, Batinah 385, Qurain 400). Plans 027a, 027c and 027d add rows in parallel; those aren't yours.
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** user feedback, 2026-09-28: "The calendar page should look more like an Outlook calendar, and the user can see the task, click it, open a modal and see in-depth details." The calendar is the Stage 1 promise that no deadline is missed across portals, time zones and GCC working weeks (spec §6.7; product-foundation's pain "deadlines live in five places").
- **Today:** `pages/gcc/s1/Calendar.tsx` (94 lines) lists the next four weeks as cards, one per week. Each row has the date, the label and the tender link, with a countdown and flags. A side card lists the working-calendar notes (`pages/gcc/s1/vm/calendarNotes.ts`). The styles are `.cal*` in `pages/gcc/s1/s1.css` about 289–298; nothing else uses them. No page links to `/calendar` with parameters.
- **Where each kind of item comes from** (read these; don't copy their rules):
  - **Key dates:** `keyDatesFor(tenant, tenderId, done)` (`domain/gcc/s1/dates.ts`) returns `KeyDateRow`s: `kind`, `label`, `date`, `time?`, `tz`, `place?`, `page?`, `note?`, `daysLeft`, `workingDaysLeft`, `past`, `flags`. Labels are in `KEY_DATE_LABEL`. Kinds: published, purchase, participation, site-visit, pre-bid, questions, answers, submission, originals, opening, validity-end, bond-validity-end.
  - **Which tenders:** `dataPort()?.rows(tenant, { kind: 'all' }, viewer, 'live', done)` gives `TenderRowVM`s the viewer may see: `id`, `shortTitle`, `issuer`, `stage`, `step`, `ownerName`, `ownerRole`, `bidManagerId`, `value`, `submission`, `nextGate { gate, slaEnd, label }`, `health`. It is already viewer-filtered and masked.
  - **Gate decisions due:** `row.nextGate.slaEnd` (the same due the tracker, "Needs your action" and DG1 decisions read).
  - **Supplier quotes due:** `rfqsFor(tenant, tenderId, done)` (`domain/gcc/s2/rfq.ts`): one `replyBy` per RFQ. Group them by tender and package: one item per package and reply date, "3 of 5 replied".
  - **Credential expiries and renewals:** `vaultFor(tenant, done, viewer)` (`domain/gcc/company/vault.ts`): `VaultRow` has `validTo`, `state`, `bids` (live bids it must hold for), `owner`, `request { due }`, `renewal`.
  - **Requests to the viewer:** `requestsFor(tenant, viewer.id, done, viewer)` (`domain/gcc/requests.ts`): `due`, `what`, `section`, `tenderId`, `status`.
  - **The working calendar:** `CALENDARS[cc]` (`data/gcc/calendar.ts`) gives `weekend` (day numbers), `closures` (Eid, with `expected`) and `ramadan { from, to, hours }`. Helpers in `domain/calendar.ts`: `isWeekend`, `isWorkingDay`, `workingDaysBetween`, `dayFlags`, `dateText`, `whenText`, `countdownText`, `weekendText`, `addDays`, `weekdayOf`. `authorityCalendar(t, tenant)` (`domain/gcc/s1/common.ts`) gives the authority's country and time zone.
  - **The demo clock:** `DEMO_TODAY` (2026-03-08, a Sunday) and `DEMO_TIME` (10:00) in `domain/calendar.ts`.
- **Kit to reuse:**
  - `ModalFrame` (`components/overlays/Frames.tsx` about 99; `wide`, `children`, Esc and focus handled), as `pages/gcc/s1/parts/Modal.tsx` uses it;
  - `When`, `SlaClock`, `SourceChip` (opens the tender PDF at a page), `GateChip`, `StatusPill`, `Money`, `Masked` (`components/tender/*`);
  - `usePop` (`components/tender/Tip.tsx`) for the "+2 more" day popover and the filter menu;
  - `useS1()` (`pages/gcc/s1/vm/useS1.ts`) for `tenant`, `viewer` and `done`.
- **Colours:** the orchestrator added `--blue*` and `--violet*` tokens to `tokens.css` for wave 9. **Don't use `--brand` for categories**: the tenants' accents are teal, violet, gold, slate and crimson, and they would clash with the category colours. **Nobody edits `tokens.css` in wave 9**; if a colour is missing, stop and ask.
- For the look, the Indian preview's `components/pipeline/TenderCalendar.tsx` and `.cal-grid` in `styles/charts.css` show a month grid. Read them for ideas only. **Don't import them**: GCC code never imports legacy modules (architecture decision 1).

## Categories (one colour and one meaning each; the legend and the modal use these words)
| Category | Items | Colour |
| --- | --- | --- |
| Submissions | submission, opening, originals delivered | `--red` |
| Authority deadlines | purchase closes, participation confirmation, questions deadline, answers due | `--orange` |
| Meetings and visits | site visit, pre-bid meeting | `--cyan` |
| Decision gates | DG1, DG2, DG3 due | `--violet` |
| Supplier quotes | RFQ replies due, per package | `--green` |
| Validity and renewals | bid validity ends, initial guarantee valid to, credential expiries, renewal requests due | `--blue` |
| Your requests | inputs and requests owed by the viewer | `--ink-4` (outlined chip) |

"Published" dates are history: leave them out, as today.

## Scope
- **Files to create or change:**
  - new `domain/gcc/calendar/events.ts` (and `index.ts`): the items and their detail, read only;
  - new `pages/gcc/calendar/Calendar.tsx`, `MonthView.tsx`, `WeekView.tsx`, `AgendaView.tsx`, `EventModal.tsx`, `calendar.css` (a `.gcal-` prefix for every class, so nothing collides with the legacy `.cal-*`);
  - delete `pages/gcc/s1/Calendar.tsx`, and the `.cal*` rules in `pages/gcc/s1/s1.css` (about 289–298) once nothing uses them. Keep `.kd-flag` and `.kd-notes`: `KeyDateList` uses them;
  - `pages/gcc/screens.ts`: the `/calendar` entry only (its `page` import and its `line`). Plan 027c edits the `/company` and `/suppliers` entries in parallel: re-read before editing, change only your line;
  - new `pages/gcc/dev-checks/78-calendar.tsx`;
  - `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md` §6.7 (the calendar paragraph) only.
- **Out of scope** (stop and ask before touching):
  - any key date, gate due, RFQ date or credential date, and the modules that compute them;
  - writing anything to demo state (no "Add to calendar" that records, no reminders);
  - `tokens.css`, the sidebar, `access.ts`;
  - the dashboards and their tiles (plans 027a, 027d).

## Steps

### Phase 1 — The items (domain, read only)
- [x] 1.1 `CalendarItemVM`, in `domain/gcc/calendar/events.ts`:
  - `id` (stable, e.g. `kd:T-2025-298:submission:2026-03-12`);
  - `category` (the table's seven);
  - `title` ("Submission deadline", "DG2 decision due", "Quotes due · Pumps and valves", "Zakat certificate expires");
  - `date`, `time?`, `tz` (the authority's zone for key dates, the tenant's for the rest), `allDay` (no time);
  - `tenderId?`, `shortTitle?`;
  - `flags: string[]` (from the key date's flags: Ramadan hours, weekend, closure);
  - `mine: boolean` (2.4 below);
  - `past: boolean`.
- [x] 1.2 `calendarItems({ tenant, viewer, done, from, to })`, sorted by date then time (untimed last in a day):
  - [x] 1.2.1 key dates of every row from the data port, published left out;
  - [x] 1.2.2 each row's next gate due, if `slaEnd` is set;
  - [x] 1.2.3 supplier quotes due, only if `can(viewer, 'sourcing.view')`: one item per tender, package and reply date;
  - [x] 1.2.4 credential expiries (`validTo`) and renewal requests due (`request.due`), only if `can(viewer, 'company.view')`;
  - [x] 1.2.5 requests to the viewer that are open or late (`requestsFor`), due date.
  - Tenders the viewer may not see never appear (the data port has already filtered them).
- [x] 1.3 `calendarItemDetail(id, ctx)` → `CalendarDetailVM`, the modal's content, read on demand:
  - `when`: the date and time in `tz` (`whenText`), with "in 4 days · 4 working days" (`countdownText`, and the working days from `KeyDateRow.workingDaysLeft` or `workingDaysBetween`); "Today" on demo day; "Passed" for a past item;
  - `where?`: the key date's `place`;
  - `source?`: the page of the tender document (for `SourceChip`);
  - `flags` with their full text;
  - `tender?`: ID, short title, issuer, stage and step (`stageShortLabel`), owner name and role, health, value (masked as the row is);
  - `needs`: two to four lines of what is still needed, by category, each read from its module:
    - **Submissions:** the bid bond's state (`bidBondFor` in `domain/gcc/s1/bond.ts`), the eligibility gaps (`eligibilityFor`), the next gate;
    - **Decision gates:** who decides, the time limit (for `SlaClock`), and for DG2 the positions recorded so far, if `domain/gcc/dg2` exposes it (else leave it out);
    - **Supplier quotes:** replied n of m, overdue n, the package;
    - **Validity and renewals:** the live bids the credential must hold for (`VaultRow.bids`), its owner, the renewal status;
    - **Your requests:** what is asked, the section it feeds, who asked;
    - **Meetings and deadlines:** the note and flags only;
  - `otherDates`: the tender's other key dates (label, date, past), with this one marked;
  - `actions`: the routes the modal offers, each only if the viewer can open it. The primary: "Open tender" → `/tenders/{id}?tab=dates` (`?tab=overview` for a gate). Secondary, by category: "Open DG1 decisions" (`/dg1`), "Open DG2 approvals" (`/dg2`), "Open DG3 approvals" (`/dg3`), "Open the package board" (the Stage 2 screen for that tender), "Open the credential" (`/company?tab=credentials&cred={id}`), "Open my requests" (`/requests`). Use `isScreenBuilt` and `can`, as `domain/gcc/actions/requests.actions.ts` does.
- [x] 1.4 `mine`: the viewer is the tender's owner or Bid Manager, or decides that gate (`can(viewer, 'dg1.decide' | 'dg2.decide' | 'dg3.decide')`), or owns the credential, or owes the request.

### Phase 2 — The page shell
- [x] 2.1 `pages/gcc/calendar/Calendar.tsx` replaces the old page at `/calendar` (update the `screens.ts` entry's `page` import; its `line` becomes "Every deadline, site visit, gate, quote and renewal across your tenders, in the authority's time zone.").
- [x] 2.2 Toolbar, left to right:
  - "Today";
  - ‹ and › (previous and next month, or week);
  - the range title ("March 2026"; "8 – 14 Mar 2026" in week view);
  - the view switch Month | Week | Agenda, a segmented control like the dashboard's Table | Graph;
  - "Only mine" (a toggle);
  - a "Show" menu with a checkbox per category, each with its colour and its item count in the visible range;
  - the time-zone note at the right ("Times in the authority's zone · AST").
- [x] 2.3 The view and the month or week shown are in the URL (`?view=month&d=2026-03-01`), so a link can open a given week. The last view is also kept per viewer in `localStorage` (`ctai.calendar.view`, try/catch).
- [x] 2.4 A legend strip under the toolbar: the seven categories with their colour and one line each (the table's Items column, shortened). The user asked for colours with meanings; this is where the calendar gives them.

### Phase 3 — Month view
- [x] 3.1 Six rows of seven days, **weeks starting Sunday** (the GCC working week starts on Sunday). Day names in the header.
- [x] 3.2 Weekend columns shaded per the tenant's country (`CALENDARS[cc].weekend`: Friday and Saturday in KSA, Qatar, Oman and Kuwait; Saturday and Sunday in the UAE). Days outside the month dimmed. Past days' numbers muted.
- [x] 3.3 Today (Sun 8 Mar 2026) circled in ink, with a small "Today" label.
- [x] 3.4 All-day banners across the days they cover: Eid closures ("Eid al-Fitr, expected"), and a thin "Ramadan hours" band for the reduced-hours period, both from `CALENDARS`.
- [x] 3.5 Each day shows up to three items as chips: a coloured dot (or the category's soft tint), the time if any, then the title and the tender's short title, on one line with ellipsis. A flagged item shows a small "!". Past items are faded.
- [x] 3.6 More than three: "+2 more", which opens a popover listing the day's items (the same chips).
- [x] 3.7 A chip is a button: Enter or click opens the modal, and focus returns to it on close. `aria-label` "Submission deadline, T-2025-298 Makkah water distribution, Thu 12 Mar 10:00 AST, Submissions".
- [x] 3.8 Clicking empty space in a day does nothing (read only).

### Phase 4 — Week view
- [x] 4.1 Seven day columns (Sunday first), with the weekend shaded, an all-day lane on top (untimed items and banners), then hours 07:00 to 19:00 in 30-minute rows. An item before or after those hours goes to the lane's edge, with its time shown.
- [x] 4.2 Timed items sit at their time, 45 minutes tall: the category's soft tint, a 1 px border in the category colour all round, and the dot before the title. **No coloured left stripe**: the user turned that idiom down on the dashboard tiles (2026-09-28). Items at the same time sit side by side.
- [x] 4.3 A "now" line across today at 10:00 (the demo clock), in `--red`, with a dot at its left.
- [x] 4.4 Scroll inside the grid to 08:00 on open; the page itself doesn't scroll sideways at 1280.

### Phase 5 — Agenda view
- [x] 5.1 Today's page, kept: the items from the start of the range, grouped by week, each row with the date and time, the category dot, the title, the tender, the countdown and the flags. The side card with the working-calendar notes stays.
- [x] 5.2 A row click opens the same modal.

### Phase 6 — The detail modal
- [x] 6.1 `EventModal.tsx` on `ModalFrame` (`wide`):
  - eyebrow: the category name with its dot;
  - title: the item's title;
  - sub: the tender ID and short title.
- [x] 6.2 Body, in this order, each section only when it has content:
  1. **When:** date and time in `tz`, countdown and working days; flags as a small list with "!". If the tenant's zone differs from the authority's, add the tenant-zone time on a second line.
  2. **Where:** the place.
  3. **Tender:** stage and step, owner with role, health pill, value (or `Masked`).
  4. **What's needed:** the `needs` lines. A gate shows its `SlaClock`.
  5. **Source:** `SourceChip` to the tender document's page.
  6. **Other dates on this tender:** a compact vertical timeline, this item highlighted, past ones ticked.
- [x] 6.3 Footer: the primary "Open tender", then the category's secondary route, then "Close". Opening a route closes the modal first.
- [x] 6.4 Esc and the scrim close it, and focus returns to the chip (`ModalFrame` handles Esc; check the return focus).

### Phase 7 — Checks and the spec
- [x] 7.1 `dev-checks/78-calendar.tsx`, 8 to 12 rows, in the active tenant:
  - every future key date of every visible live tender in the next 8 weeks appears once, on the same date and time as `keyDatesFor`;
  - every gate item equals the row's `nextGate.slaEnd`;
  - every quotes item equals the earliest `replyBy` of its package's RFQs, and its replied count matches;
  - every credential item equals the vault's `validTo`;
  - a viewer without `sourcing.view` (a committee member) gets no Supplier quotes items; one without `company.view` gets no credential items;
  - no item belongs to a tender the viewer can't see (a restricted tender, as a non-cleared person);
  - weekend days per country: KSA Fri–Sat, UAE Sat–Sun.
- [x] 7.2 Spec §6.7: replace the calendar paragraph with the month, week and agenda views, the seven categories and the modal.

## Data and derivation
- No new facts. New read-only derivations: `calendarItems`, `calendarItemDetail`.
- No new `done` keys; `localStorage` `ctai.calendar.view` is a convenience, and the page works without it.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row; the new 78 passes.
- [x] Najd, Faisal Al-Harbi, `/calendar`, at 1440 and 1280, light and dark, no console errors:
  - [x] March 2026 opens in month view, Sun 8 Mar marked; Fridays and Saturdays shaded; the Eid al-Fitr closure (expected Thu 19 – Sat 28 Mar) shows as a banner; Ramadan hours show as a band;
  - [x] the items of today's agenda (DG2 due 14:10 on T-2026-097, DG1 due 16:10 on T-2026-117, DG1 on T-2026-118 Mon 9 Mar 07:44, DG3 on T-2025-305 Mon 9 Mar 16:00, T-2026-122 purchase closes Tue 10 Mar, T-2025-298 submission Thu 12 Mar 10:00, and so on) sit on their days in the right colours;
  - [x] clicking the T-2025-298 submission opens the modal, with when, countdown, tender, what's needed, the source page and its other dates; "Open tender" lands on its Key dates tab; *(T-2025-298 is on the Stage 4–9 register, with no typed key dates and no document, so its modal has no source page and no other dates: see Deviations. The hero's dates show both.)*
  - [x] a DG item's modal shows the time limit, and its secondary button opens the gate screen;
  - [x] Week view shows the "now" line at 10:00 today; Agenda view shows today's list;
  - [x] Only mine and the Show menu filter the items, and the counts in the menu match.
- [x] Najd Procurement Lead: Supplier quotes items appear. A committee member: none, and no credential items. *(Committee members hold `company.view` in `access.ts`, so they do see credential items; the Commercial Manager, who lacks it, sees none. See Deviations.)*
- [x] Corniche (UAE): Saturdays and Sundays shaded; T-2026-061's dates sit in the authority's zone.
- [x] Batinah (Oman): T-2026-042's Arabic-sourced dates show their English label.
- [x] Keyboard: Tab reaches the toolbar and each chip; Enter opens the modal; Esc closes it, and focus returns to the chip.
- [x] Reset demo returns everything to seed (the calendar records nothing).
- [x] No hard-coded numbers in components; no role checks outside `access.ts`.

## Execution report
Executor, 2026-09-28.

- **Changed files:**
  - new `app/src/domain/gcc/calendar/events.ts` and `index.ts`:
    - `calendarItems`, `calendarItemDetail` (read only);
    - the category table (`CALENDAR_CATEGORIES`, `CATEGORY_LABEL`);
    - `calendarBanners`, `weekendDays`, `weekStart`, `tzNote`, `itemCountdown`, `itemLabel`, `monthTitle`, `spanTitle`.
  - new `app/src/pages/gcc/calendar/`: `Calendar.tsx`, `MonthView.tsx`, `WeekView.tsx`, `AgendaView.tsx`, `EventModal.tsx`, `calendar.css`, and `Chip.tsx` (the chip the three views and the "+n more" list share).
  - `app/src/pages/gcc/screens.ts`: the `/calendar` entry only (page import and line).
  - deleted `app/src/pages/gcc/s1/Calendar.tsx` and the `.cal*` block of `app/src/pages/gcc/s1/s1.css`. `.kd-flag` and `.kd-notes` are kept.
  - new `app/src/pages/gcc/dev-checks/78-calendar.tsx`, 12 rows.
  - `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md` §6.7: a new bullet group, "The Calendar page". §6.7 had no paragraph about the page to replace, so it was added at the end.
- **Verification:**
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass. The chunk-size warnings were there before.
  - `/dev/checks`, each tenant as its Head of Tendering: no failing row and no crashed panel. Najd 817, Corniche 408, Dafna 389, Batinah 397, Qurain 412 passing, which is wave 8's counts plus 78's 12 in each. The other wave 9 plans had not added rows when this ran.
  - Browser: headless Chromium (Playwright from the npx cache, driven from the session scratchpad) on the running dev server, in its own browser context. No console errors in any run.
  - Najd as Faisal Al-Harbi, at 1440 and 1280, light and dark:
    - month view: March 2026; Fri and Sat shaded; 8 Mar circled with "Today"; the Ramadan hours band to Thu 19 Mar; the Eid al-Fitr banner Thu 19 – Sat 28 Mar;
    - today's agenda items on their days: DG2 14:10 T-2026-097, DG1 16:10 T-2026-117, DG1 Mon 9 Mar 07:44 T-2026-118, DG3 Mon 9 Mar 16:00 T-2025-305, T-2026-122 purchase closes Tue 10 Mar, T-2025-298 submission Thu 12 Mar 10:00;
    - the T-2025-298 modal: its "Open tender" lands on `/tenders/T-2025-298?tab=dates`;
    - the DG2 modal shows "4 h 10 m left of 24 h", and "Open DG2 approvals" lands on `/dg2?tender=T-2026-097`;
    - the week view has the now line at 10:00 on Sunday. The agenda keeps the old list and the working-calendar card. The view is kept in the URL and in `ctai.calendar.view` across a reload;
    - Show counts match the chips, both with and without Only mine (3 of 30 in March);
    - no sideways scroll at 1280 in any view.
  - Keyboard, Najd: Tab reaches the toolbar, then each chip. Enter opens the modal with focus on "Open tender", and Esc returns focus to the chip. From a "+n more" list, focus returns to "+n more".
  - Other Najd personas: the Procurement Lead sees 22 Supplier quotes in March. The CFO (committee) and the Commercial Manager see none. The Commercial Manager has no credential items.
  - Other tenants:
    - Corniche: Sat and Sun shaded; Eid Fri 20 – Mon 23 Mar. T-2026-061's dates show in GST, and the hero's in AST with "11:00 GST in your time zone".
    - Batinah: T-2026-042's dates carry their English labels, and the site visit's modal shows the Arabic it was read from, with the p. 4 chip.
    - Dafna and Qurain: Fri and Sat shaded.
  - Reset: "Start: RFQs out" removes the hero's DG1 due and adds its 11 package quote items. Settings › Reset this company returns the agenda to its seed list, item for item. The calendar writes no `done` key: `doneBy` stayed `{}` through every click.
- **Deviations from plan:**
  1. T-2025-298, and every tender on the Stage 4–9 register, has no typed key dates, no document and no Stage 1 record:
     - it shows its submission from `row.submission`, as the old page did;
     - its modal therefore has no source page, no other dates, no bid bond from `bidBondFor` and no eligibility;
     - "What's needed" instead reads its stage facts (017): Stage 8 package readiness, signatures and the issued bond's validity; Stage 7 evidenced requirements, gaps and redlines; Stage 6 sections; Stage 5 the price due and the finance check. It shows no bond amount, price or margin.
     The acceptance line assumed a key-date record that doesn't exist. The hero's dates show the source chip and the timeline.
  2. Committee members hold `company.view` (`access.ts`), so they do see credential items (none fall in March in Najd). Row 6 of check 78 uses someone without `company.view` (the Commercial Manager) instead. `access.ts` is not changed.
  3. Each item has a `chip` label ("Submission", "DG2 due", "Quotes · GRP pipes DN1000") beside `title`, because full titles filled the month cell before the tender name. The modal and the accessible names keep the full title.
  4. The week grid opens at 08:00, or at the hour of an earlier item in that week (T-2026-118's DG1 at 07:44 opens it at 07:00), so no block starts out of view.
  5. A renewal request the viewer owes appears once, under Your requests, not also under Validity and renewals.
  6. Overdue gates, late requests and overdue supplier replies carry a flag (the "!"), and their countdown reads "Overdue" or "Late".
  7. The agenda steps by four weeks with ‹ and ›.
  8. The chip's dot and the modal eyebrow's dot use the category colour; Your requests use a ring. No left stripes.
  9. The tenant-zone line in the modal uses a small table of standard UTC offsets for the four zone labels the demo uses (AST, GST, UTC+3, EET).
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - At 1440 a month cell holds about 15 characters of chip text, so most tender names are cut. The full text is in the tooltip, the accessible name and the modal. Narrower weekend columns would give weekdays more room, if wanted.
  - Najd's Thu 5 Mar and Sun 15 Mar carry 9 and 11 items, mostly Supplier quotes, so "+n more" is busy. A "group quotes by tender" option could help.
  - `calendarItemDetail` recomputes every item to find one. It is fast enough for a click, but could take the item directly.
