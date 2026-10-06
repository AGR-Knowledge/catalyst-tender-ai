# 044 — Contact links and the user manual

Status: DONE — awaiting review (2026-10-06) · Depends on: none · Can run in parallel with: 039, 040, 041, 042, 043

## Goal
1. When the Head of Tendering reviews the final work before approving (DG2, DG3), they can reach the person who did each piece in one click: **Calendar** (an invite), **Call** (a Teams call) or **Teams** (a chat).
2. Every company, GCC included, has the **user manual**, the existing `/workflow` page, opened from Settings. It explains Stages 1 to 9, what each does and why.

## Context
- User's change list of 2026-10-06, items 14 and 15. Read `app/plans/README.md` → "Wave 12".
- **Item 14, user decision:** real links, not simulated. Nothing is stored and no demo state changes.
- **Item 15, user decision:** the manual is the existing page `src/pages/Workflow.tsx` (route `/workflow`, live at catalyst-tender-ai.vercel.app/workflow on the Indian preview): gate cards, the nine-stage chips with each stage's agent, human tasks, outputs and KPIs, and the RACI table. **Reuse it as it is; don't write a new one.** Today it is `LegacyOnly` (`src/App.tsx:152`), so GCC tenants are redirected away. It reads Indian live counts (`useLive()`: gate "waiting" counts and stage "live" counts), which must not show under a GCC brand (CLAUDE.md rule 9).
- Where the Head of Tendering approves: the DG2 page `src/pages/gcc/dg2/` (committee positions in `MembersPanel` / `members.ts`, the pack's inputs) and the DG3 page `src/pages/gcc/dg3/` (evidence per stage, its owners).

## Scope
- Files to create: `src/data/gcc/contacts.ts`, `src/domain/gcc/contact.ts`, `src/components/tender/ContactLinks.tsx`, `src/components/tender/contact-links.css`.
- Files to change: `src/pages/gcc/dg2/**`, `src/pages/gcc/dg3/**`, `src/components/tender/MembersPanel.tsx`, `src/pages/Workflow.tsx`, `src/pages/Settings.tsx`, `src/App.tsx` (the `workflow` route line only; re-read right before editing).
- Out of scope (stop and ask): rewriting the manual's content; other pages (Needs your action, the workspace, booklet approval: list them as follow-ups); `src/data/people.ts` (plan 043 is renaming people, so derive from it and don't edit it); any new library.

## Steps
### Phase 1 — Contact facts and links
- [x] 1.1 `data/gcc/contacts.ts`: an email domain per GCC tenant on the reserved `.example` top-level domain (e.g. `najd-arcline.example`), so no real mailbox is ever addressed. Optionally, per-person overrides. No phone numbers: calls go through Teams, so no real number can be dialled.
- [x] 1.2 `domain/gcc/contact.ts`:
  - `emailOf(person, tenant)`: `first.last@domain`, built from the person's **current** name (plan 043 may rename people), lower case, ASCII only (strip "Al-" hyphens sensibly);
  - `teamsChatUrl(email, message)` → `https://teams.microsoft.com/l/chat/0/0?users=<email>&message=<encoded>`;
  - `teamsCallUrl(email)` → `https://teams.microsoft.com/l/call/0/0?users=<email>`;
  - `calendarInvite({ to, subject, body, start, minutes, tz })` → an `.ics` file (`text/calendar`, METHOD:REQUEST, one VEVENT with ORGANIZER = the viewer, ATTENDEE = the contact). Start: the next working half-hour slot after the demo clock, in the tenant's zone and working week (`domain/calendar.ts`); 30 minutes.
  - The message and subject say what it's about: `Re T-2026-097 DG2: your position (Commercial)`.
- [x] 1.3 `ContactLinks`: three small icon buttons with text labels, **Calendar**, **Call**, **Teams** (lucide icons already in the project), each with a tooltip naming the person and what it opens ("Teams chat with Sultan Al-Anazi"). Teams and Call are `<a href target="_blank" rel="noopener">`; Calendar downloads the `.ics` (Blob + object URL, revoked afterwards). Keyboard reachable; works in light and dark. A compact variant (icons only, with `aria-label`) for tight rows.
- [x] 1.4 Only for other people: never shown on the viewer's own row. Hidden for people the viewer may not see by masking rules (follow the same masking as the name).

### Phase 2 — Where they appear
- [x] 2.1 DG2: beside each committee member in `MembersPanel` (position given or awaited), and beside each pack input's contributor where the pack names them.
- [x] 2.2 DG3: beside each evidence item's owner (the stage owner or the person who completed it).
- [x] 2.3 The Head of Tendering sees them on both pages. Other personas see them too wherever these pages show (contacting colleagues isn't restricted), but never on their own row.
- [x] 2.4 The rows keep their alignment: the buttons sit at the row end and the same width on every row (user's rule: the same text rows everywhere).

### Phase 3 — The user manual for every company
- [x] 3.1 Route: `/workflow` renders the same `Workflow` page in both worlds. Keep the content and layout exactly; only the live numbers change source:
  - the Indian preview keeps `useLive()`;
  - a GCC tenant reads the GCC lifecycles (`queriesFor`): gate "waiting" = open DG1/DG2/DG3 gates; stage "live" = live tenders per stage.
  - Split the page so GCC code never imports Indian data modules: e.g. `Workflow` takes `counts` as props, with a legacy wrapper and a GCC wrapper. If `src/data/stages.ts` (`STAGES`, `GATES`, `RACI`) holds anything India-specific, **stop and ask**; if it is generic product content, the GCC wrapper may use it, and you note that in the report.
- [x] 3.2 Persona buttons on the page ("View as …", "Go to my dashboard"): in a GCC tenant they switch to that tenant's person with that role (the existing persona switch); a role with no person in the tenant shows no button.
- [x] 3.3 Settings: a row in both worlds, title "User manual", text "How the nine stages and three decision gates work, who does what, and what each stage produces", button **Open** → `/workflow`. Also make it reachable from the persona/user menu if Settings is the only entry and the menu has a natural place for "User manual"; otherwise Settings only.
- [x] 3.4 Page title reads "User manual" (the sidebar's current label for `/workflow`, if any, stays as it is).

### Phase 4 — Checks
- [x] 4.1 Add a dev check (a new `83-contact.tsx`): `emailOf` gives `.example` addresses for every GCC person; the Teams URLs are well formed; the `.ics` has one VEVENT whose start is a working slot in the tenant's week. About 5 rows.

## Data and derivation
- New facts: `data/gcc/contacts.ts` (email domains). Everything else is derived.
- No new `done` keys; nothing is written to the demo state.

## Demo-grade rules
- Build what the prospect sees; dev checks stay short.
- Non-negotiables: masking holds; the manual shows no Indian numbers under a GCC brand; Reset works.

## Acceptance checks
- [x] typecheck and build pass (own files clean; see the report: the shared tree fails only on plan 043's wadi-zarqa.ts, so build was run on a copy with that one apostrophe escaped).
- [x] Najd Head of Tendering (`najd.hot`), port 5196: `/tender/T-2026-097/dg2` (or wherever DG2 opens from Needs your action) shows Calendar · Call · Teams beside each member except the viewer. Teams opens a `teams.microsoft.com` link to an `@….example` address; Calendar downloads an `.ics`.
- [x] DG3 on T-2025-305 shows them beside each evidence owner.
- [x] Settings → User manual → `/workflow` opens in Najd with GCC counts, and in Genesis EPC India with today's counts. Both look identical in layout.
- [x] No console errors at 1440 and 1280, light and dark; Reset demo returns to the seed state.

## Execution report
(Executor, 2026-10-06.)

- Changed files:
  - New: `src/data/gcc/contacts.ts` (an `.example` mail domain per GCC tenant, the platform's, a fallback, an empty per-person override map, the meeting length and office hours outside Ramadan); `src/domain/gcc/contact.ts` (`emailOf`, `teamsChatUrl`, `teamsCallUrl`, `contactSubject`, `hoursOn`, `nextSlot`, `slotText`, `utcOf`, `calendarInvite`, `contactFor`); `src/components/tender/ContactLinks.tsx` and `contact-links.css`; `src/pages/gcc/dev-checks/83-contact.tsx`.
  - New for the manual split: `src/pages/workflow/WorkflowView.tsx` (the page itself, counts and persona buttons as props, reads only `data/stages.ts` and `components/ui/primitives`) and `src/pages/gcc/workflow/GccWorkflow.tsx` (the GCC wrapper, lazy-loaded).
  - Changed: `src/pages/Workflow.tsx` (now the world switch plus the legacy wrapper on `useLive()`); `src/App.tsx` (the `workflow` route line only: `<Workflow />`, no `LegacyOnly`); `src/components/tender/MembersPanel.tsx` (`personId` on a row, `contactSubject` prop, links beside the name); `src/pages/gcc/dg2/Dg2.tsx`, `members.ts`; `src/pages/gcc/dg3/Dg3.tsx`, `Evidence.tsx`, `dg3.css`; `src/pages/Settings.tsx` (Help card, User manual row, Open).
  - Changed outside the listed files (one or two lines each, no lane owns them): `src/pages/gcc/s3/sections/Inputs.tsx` and `src/pages/gcc/s3/Pack.tsx` (`contacts={mode === 'gate'}`) for step 2.1's pack inputs; `src/pages/gcc/screens.ts` (`screenHead('/workflow')` → "User manual") and `src/components/layout/Header.tsx` (the Indian title "User manual"; a "User manual" item at the foot of the GCC persona menu) for steps 3.3 and 3.4.
- Verification:
  - `npm run typecheck` in the shared checkout: the only errors are in `src/data/extracted/gcc/wadi-zarqa.ts` line 540 (plan 043's edit left an unescaped apostrophe, `plant's`), which also stops the dev server from loading any GCC page. My files are clean. To click-check, I ran Vite on port 5196 from a scratch copy of the checkout with that one apostrophe escaped (the repo file untouched). `npm run build` on a fresh copy of the current tree with the same one-character fix: typecheck and build pass (the usual large-chunk warning).
  - Najd, Head of Tendering, `/dg2?tender=T-2026-097`, 1440 light and 1280 dark: Calendar · Call · Teams beside all five members, at the row end, one width; the members' words keep the full width below. Teams opens `https://teams.microsoft.com/l/chat/0/0?users=abdulaziz.aldosari@najd-arcline.example&message=Re%20T-2026-097%20DG2%3A%20your%20position%20(CEO)`; Call `…/l/call/0/0?users=…`; Calendar downloads `t-2026-097-dg2-your-position-ceo-eng-abdulaziz-al-dosari.ics` (METHOD:REQUEST, one VEVENT, organiser Faisal, attendee the CEO, Sun 8 Mar 10:30 AST = 07:30Z, 30 minutes, inside Ramadan hours). As the CFO: no links on his own row, an invisible copy holds the width. 9.9 Inputs status (opened) shows compact icon links beside each contributor at DG2 only.
  - `/dg3?tender=T-2025-305`, 1440 light as the Head of Tendering and 1280 dark as the Bid Manager: links beside the issuer (Lina Barakat, Compliance) and beside each risk owner and signatory; the Bid Manager's own signatory row has none, with the width held.
  - `/workflow` in Najd (GCC counts: DG1 2, DG2 1, DG3 1 waiting; 12 · 2 · 2 · 2 · 2 · 2 · 1 · 4 live) and in Genesis EPC India (today's `useLive()` counts, unchanged behaviour): identical layout, title "User manual". "Act as Arjun Pillai" on Stage 4 switches to Najd's Planning Manager and opens his dashboard. Settings → Help → User manual → Open opens `/workflow` in both worlds; the GCC persona menu's "User manual" item does too.
  - No console errors on any of these loads. Nothing writes demo state (the persisted `doneBy` stays `{}` after using the links), so Reset demo is unaffected.
  - `/dev/checks`, dev check 83: 6 of 6 pass in Najd, Corniche, Dafna, Batinah and Qurain (Corniche's slot is Mon 9 Mar 09:00 GST, its weekend being Sat–Sun).
- Deviations from plan:
  - The GCC persona button reads "Act as …" rather than "View as …": in a GCC company View as is the Head of Tendering's read-only, audited feature, and this button is the full persona switch. The RACI sub-line says "act as" to match. The Indian preview keeps "View as".
  - The GCC wrapper matches a stage or RACI row to a person by title first ("Planning Manager" → the Planning Manager, "Compliance / Legal" → the Compliance / Legal Lead), then by `RACI`/`STAGES` role key, because `data/stages.ts` keys the Planning Manager row and Stage 4 to `bid`. The Head of Tendering has no RACI row, so nothing is highlighted for them.
  - Pack inputs use the compact (icons-only) variant in the six-column table; members and DG3 items use the labelled one. The DG3 page also gets links beside the pack's issuer, the person who completed the pack.
  - Four files outside the list were touched (see above); without them steps 2.1, 3.3 and 3.4 can't be met.
  - Plan 1.2's signature `calendarInvite({ to, subject, body, start, minutes, tz })` also takes `from` (the organiser) and an optional `stamp`.
- Blockers / questions:
  - `src/data/stages.ts` is product content, not India-specific (no Indian place, currency or portal), so the GCC wrapper uses it, as the plan allows. Two things in it read oddly under a GCC brand and need the orchestrator's call (rewriting it is out of scope): (a) KPI lines state figures as if achieved ("Response rate 79%, up 22 pts since go-live", "64% of content reused", "100% on-time submission (19 of 19 this quarter)", "Simulated score up 6 points"), which a prospect will read as this company's numbers; (b) the gate cards say DG2 is owned by the "Bid Committee" and DG3 by the "Tender Review Board", whereas in the GCC model the Head of Tendering approves both (dashboards.md §9).
  - Plan 043's `wadi-zarqa.ts` apostrophe (above) breaks the shared dev server and build until 043 fixes it.
- Follow-ups noticed (not done):
  - Contact links on other pages: Needs your action, the tender workspace (team, inputs, requests), the pack page `/packs` and its Inputs tab, booklet approval.
  - The persona menu's "User manual" item sits at the foot of the scrolling list, below View as…; it needs a scroll to reach in a 900 px window.
  - The manual's GCC counts are lifecycles the viewer may see (live tenders per stage), not plan 039's active notices; check they read consistently with the new funnel once 039 lands.
- Review follow-up (executor, 2026-10-06; user decision "Fix for GCC"):
  - New `src/pages/gcc/workflow/manual.ts`, a GCC overlay over `data/stages.ts` (that file is untouched). `GccWorkflow.tsx` passes `stages` and `gates` to `WorkflowView`, which takes them as optional props defaulting to `STAGES` / `GATES`, so the Indian preview renders exactly as before.
  - Gate cards (owner · waiting, then the line below), GCC only. The owner stays one line; the qualification moves to the line below.
    - DG1: "Bid Manager" / "After Stage 1, recorded against the tender. The Head of Tendering may record it as a delegate" (dashboards.md §9).
    - DG2: "Head of Tendering" / "After Stage 3, once the committee has recorded its positions on the evidence pack" (R8).
    - DG3: "Head of Tendering" / "After Stage 7. No submission without this approval" (R9).
    - The SLAs are read from `GATE_SLA_HOURS`; the head title from the tenant.
  - Every stage's KPI lines read "Target: …", with figures from the GCC targets in code where they exist: `INTAKE_TARGET_MIN`, `STAGE_BANDS.repliesOnTime`, `GATE_SLA_HOURS`, `RATE_BANDS` PLN-6 and PRC-2, `TURNAROUND_HOURS`, `HANDOVER_DAYS`. Calibration ±10 is the catalogue's OUT-4; `record.ts`'s constant isn't exported. Where there is no target, the line reads "Measured: …": Stage 6 reuse (PRP-6 is information only) and Stage 9 delivery delays (delivery is outside the demo).
  - Also overlaid, because they named the old gate owners on the same page: Stage 3 "Bid Committee takes the bid / no-bid decision at DG2" → "Committee members record their positions; the Head of Tendering approves at DG2"; Stage 7 "Tender Review Board clears DG3" → "The Head of Tendering approves submission at DG3".
  - Verified: typecheck passes (the whole tree, now that 043's file is fixed). Dev server on 5196 with `--force`. `/workflow` in Najd (stages 3, 6, 8, 9; 1440 light, 1280 dark) shows the new owners and target lines; Genesis EPC India stage 8 still reads "Bid Committee", "Tender Review Board" and "100% on-time submission (19 of 19 this quarter)". No console errors.
