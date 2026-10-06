# 041 — Calendar lead-up: three working days of warning

Status: DONE — awaiting review (2026-10-06) · Depends on: none · Can run in parallel with: 039, 040, 042, 043, 044

## Goal
Nothing due on a tender surprises the Head of Tendering. Every decision or action due shows in the calendar on the **3 working days before** its due date, as well as on the day itself, so they see it coming.

## Context
- User's change list of 2026-10-06, item 17: "for every tender where we need to take a decision or do an action show it for 3 consecutive working days so that i am aware of it in advance". User decision: this applies to **all** tenders; "weak" is not a separate label. Read `app/plans/README.md` → "Wave 12".
- Current behaviour: `src/domain/gcc/calendar/events.ts` builds the calendar items (plan 027b) from key dates, gate time limits, supplier replies, credential expiries and renewals, and the viewer's requests. Each item sits on its own day only. The pages are in `src/pages/gcc/calendar/` (Month, Week, Agenda views; Day and Event modals). Dev check `78-calendar.tsx`.
- The user's standing calendar rules (memory, 2026-09-28): it feels like Outlook; the month fits the screen without scrolling; a full day shows the most important items on top and "+n more", which opens the day. Weeks follow the country: Sun–Thu in KSA, Qatar, Oman and Kuwait; Mon–Fri in the UAE. Holidays come from `data/gcc/calendar`.

## Scope
- Files to change: `src/domain/gcc/calendar/**`, `src/pages/gcc/calendar/**`, dev check `78-calendar.tsx`.
- Out of scope (stop and ask): any other page that lists dated items (Needs your action, tracker, Key dates tab); new data; any new library.

## Steps
### Phase 1 — Which items get a lead-up
- [x] 1.1 An item gets a lead-up when it asks someone to **decide or do** something: gate decisions due (DG1/DG2/DG3), submissions, authority deadlines (document purchase, participation, questions), the viewer's requests, renewals due and credential expiries. Bid openings, answers published by the authority and other information-only dates don't. List the final mapping, category by category, in the report.
- [x] 1.2 Lead-up days are the **3 working days before** the due date in the tender's country (the authority's calendar, as the item already uses), skipping weekends and holidays. If the due date is within 3 working days of demo day (Sun 8 Mar 2026), only the remaining days from today onward show. Nothing appears before today.

### Phase 2 — How a lead-up looks
- [x] 2.1 A lead-up entry is a lighter version of the item's chip (same category colour, outlined or tinted, never a coloured left stripe), with the countdown as words: `In 3 days · DG2 · T-2026-097`, `In 2 days …`, `Tomorrow …` (counted in working days). The due day keeps today's chip.
- [x] 2.2 Ordering in a day: due items first (in the existing category order), then lead-ups, nearest due first. Lead-ups fold into "+n more" before any due item does.
- [x] 2.3 Clicking a lead-up opens the same Event modal as the due item, with one extra line at the top: "Due <weekday d Mon>, in N working days".
- [x] 2.4 The legend (the "How to read this" ⓘ or the category key) explains the lighter chips: "Coming up: shown on the 3 working days before it is due".
- [x] 2.5 Agenda view: show the lead-ups too, under each day, styled the same. Week view: the same as month.
- [x] 2.6 A filter or toggle "Show coming-up days" (on by default), so the presenter can switch them off if the month gets busy. Keep its state with the calendar's other view choices.

### Phase 3 — Checks
- [x] 3.1 Dev check 78: for three sample items (a DG gate, a submission, a renewal), the lead-up days are exactly the 3 working days before, in the right country week (one KSA, one UAE tender), skipping a holiday if the data has one in range; information-only items have none. About 6 rows.
- [x] 3.2 The month still fits 1440 × 900 and 1280 × 800 with no page scroll.

## Data and derivation
- No new facts. Lead-ups are derived in `domain/gcc/calendar/events.ts` from the items that already exist and the country calendars.
- No new `done` keys. The show/hide toggle is a view preference stored like the calendar's existing view choice (not under `ctai.demo.v2` unless that's where the view choice already lives). Reset demo still restores the seed state.

## Demo-grade rules
- Build what the prospect sees; dev checks stay short; polish where the eye lands (the month view).
- Non-negotiables: the calendar never disagrees with the Key dates tab or the tracker on a due date; masking holds; Reset works.

## Acceptance checks
- [x] typecheck and build pass.
- [x] Najd Head of Tendering (`najd.hot`), port 5193, `/calendar`, month and week, 1440 and 1280: items due on 10–12 Mar show lead-up chips on the working days before them from today on. DG2 on T-2026-097 and the booklet purchase on T-2026-122 are good ones to look at.
- [x] Corniche (UAE, Mon–Fri week): a lead-up skips Sat–Sun.
- [x] The Bid Manager sees lead-ups only for items they may see.
- [x] No console errors; Reset demo returns to the seed state.

## Execution report
Executor, 2026-10-06.

- Changed files:
  - `src/domain/gcc/calendar/events.ts`: `LeadUp` on `CalendarItemVM.lead`; `LEAD_DAYS`, `hasLeadUp`, `leadDays`, `leadDaysLeft`, `leadWord`, `calendarLeadUps`, `calendarOrder`; `ccOf` exported. `byImportance` puts lead-ups after every due item, nearest due first. `calendarDay` adds a last "Coming up" group, and its count reads "3 items · 1 flagged · 3 coming up". `itemCountdown` and `itemLabel` handle a lead-up. `calendarItemDetail` opens a lead-up id (`lead:<day>:<due id>`) as its due item, with `lead: "Due Thu 12 Mar, in 3 working days"`. `calendarItems` itself is unchanged.
  - `src/pages/gcc/calendar/Calendar.tsx`: merges the due items and the lead-ups. The legend counts only due items. The new "Coming-up days" switch (aria-label "Show coming-up days", on by default) is kept in `localStorage` under `ctai.calendar.lead`, next to `ctai.calendar.view`, not under `ctai.demo.v2`. "How to read the calendar" gains a sample lighter chip and the sentence. The time-zone note gets a `title`.
  - `src/pages/gcc/calendar/Chip.tsx`: the `lead` chip reads `In 3 days · DG2 · T-2026-097`.
  - `src/pages/gcc/calendar/EventModal.tsx`: the dashed line "Due …, in N working days" at the top.
  - `src/pages/gcc/calendar/DayModal.tsx`: the "Coming up" group, with the countdown and a hollow dot per row, and "Due Thu 12 Mar" on the right.
  - `src/pages/gcc/calendar/AgendaView.tsx`: lead-ups after each day's due items, reading "In 3 days: Submission deadline"; the week's count is due items only.
  - `src/pages/gcc/calendar/calendar.css`: the lighter chip has a dashed outline in the category colour, a hollow dot and no tint (no left stripe); styles for the day, agenda, modal and legend rows. The time-zone note now shortens with an ellipsis instead of wrapping the toolbar. Below a 1080 px content width it is hidden, because the ⓘ still says it.
  - `src/pages/gcc/dev-checks/78-calendar.tsx`: rows 18–26, nine rows (see Verification).
- Final mapping (1.1). A lead-up goes on:
  - Decision gates: DG1, DG2 and DG3 due.
  - Submissions: the submission, and the originals delivered.
  - Authority deadlines: document purchase, participation, questions.
  - Your requests: all of them.
  - Validity and renewals: credential expiries and renewal requests due.
  
  No lead-up on:
  - the bid opening and the answers the authority publishes;
  - site visits and pre-bid meetings (the plan didn't list them; one line in `KIND_LEADS` adds them);
  - supplier quotes (the suppliers' action);
  - bid validity ends and guarantee valid to.
  
  Lead days come from the item's own country: the authority's for a key date, the tenant's for the rest, as the countdown already does. Weekends and closures are skipped. Nothing shows before today, and nothing for an item already passed or overdue.
- Verification:
  - Typecheck passes (0 errors at the end, with the other lanes' files). `vite build` passes, with the output in the scratchpad, not `app/dist`. Its only warning is the circular-chunk warning on `domain/gcc/s1`, which predates this wave.
  - Dev check 78 is 26 of 26 in all five tenants: Najd, Corniche, Dafna, Batinah, Qurain. Najd: 30 items get lead-ups, 85 lead-up days. Samples:
    - Submission T-2025-298, due Thu 12 Mar (SA), shows on Mon 9, Tue 10 and Wed 11 Mar.
    - Corniche: submission T-2026-004 shows on Mon to Wed in the UAE. DG1 on T-2026-061, due Mon 9 Mar, has none, rightly: its three working days (Wed 4 to Fri 6 Mar) are before today.
    - Batinah: DG3 on T-2026-020 shows on Sun 8 and Mon 9.
    - Pure-function row: KSA skips Fri–Sat, the UAE skips Sat–Sun, and a due date of Sun 29 Mar in KSA skips Eid (19–28 Mar): 16, 17, 18 Mar.
    - The Bid Manager and the Coordinator (not cleared) get no stray lead-ups.
  - Clicked through on port 5193, with no console errors:
    - Najd as the Head of Tendering, at 1440×900 and 1280×800: month, week, work week, agenda; the day lists for 8 and 10 Mar; the Event modal from a lead chip; the ⓘ legend; the switch off and on, which survives a reload; dark theme.
    - Corniche at 1440 and 1280: lead-ups skip Sat–Sun, e.g. Fri 3 Apr "In 2 days" for Tue 7 Apr.
    - Najd as the Bid Manager.
    - The page doesn't scroll in any of those views and sizes; `scrollHeight` equals the viewport.
  - T-2026-122's booklet purchase (due Tue 10 Mar) shows "In 2 days" on Sun 8 and "Tomorrow" on Mon 9 (Thu 5 is before today). DG2 on T-2026-097 is due today at 14:10, so it has no lead-up days left; it shows as due on 8 Mar.
  - Reset demo: no new `done` keys. Lead-ups are derived from the items, so they follow any decision and its reset. The switch is a view choice, like the view, and Reset leaves it alone.
- Deviations from plan:
  - One working day before a due date across a weekend or closure reads "Next working day", not "Tomorrow". Example: Thu 2 Apr for Sun 5 Apr in KSA. "Tomorrow" would have meant a Friday.
  - The toolbar's time-zone note now shortens (ellipsis, full text on hover and in the ⓘ) and hides below 1080 px content width. Otherwise the new switch pushed it onto a second line at 1280 and took about 36 px from the grid.
  - "Working days left" for a lead-up counts the lead day itself (`leadDaysLeft`). A Qatar expiry due on Friday 31 Jul therefore reads "in 1 working day" on Thu 30 Jul, not 0.
  - The lead-up chip carries the tender number, not the short title, as the plan's example does. The modal and the day list show both.
- Blockers / questions: none open.
  - For about 15 minutes, `src/data/extracted/gcc/wadi-zarqa.ts` (lane 043) had an unescaped apostrophe ("plant's") and the app returned 500. I didn't touch it. I verified on a scratchpad copy with only that apostrophe escaped, then re-ran on the real checkout once 043 had fixed it.
  - Meanwhile, `components/dashboard/DashboardPage.tsx` (lane 040) had a passing type error.
- Follow-ups noticed (not done):
  - Site visits and pre-bid meetings: add lead-ups if the user counts attending as an action.
  - The check's "Got" text reads "1 working days left" in the singular case (dev text only).
  - Some days at the end of March hold three or four lead-ups. "+n more" folds them, but the switch is there if the month reads busy in a demo.
