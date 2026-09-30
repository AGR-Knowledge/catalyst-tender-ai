# 036 — The Debrief tab and sign-off

Status: DONE (2026-09-30, reviewed) · Depends on: the wave 11 contract (below); 035 for real data (build against the stubs, verify once 035's Phase 3 is ticked) · Can run in parallel with: 035, 037

## Goal
In any tender that ended, a **Debrief** tab shows what we know about the ending. The Project Director records why it was won, lost or stopped, and what we learned, in one short form. The Head of Tendering reads the record and either accepts it into the archive or sends it back with a note. Once accepted, the record also sits in the tender's Library. A prospect watches a result become written, signed-off learning in about two minutes.

## Context
- **Why:** the user's request of 2026-09-30: when a tender is won, lost or interrupted, take feedback from the tender's Project Director in a form, for the archive the KPI team analyses. User decisions:
  - every ending gets a debrief (won, lost, cancelled by the employer, withdrawn, No-Bid at DG2, rejected at DG3);
  - the Project Director records it, and the Head of Tendering signs it off;
  - no new role.
  product-foundation.md pain 5: "win/loss reasons live in emails and memory".
- **The wave 11 contract** (written by the orchestrator; typecheck passes). **Import only from `@/domain/gcc/debriefs`**:
  - `debriefFor(ctx, tenderId): DebriefVM | null`: null when the tender has no ending;
  - `draftFor(vm)`, `validateDebrief(input, vm)`;
  - `debriefSubmitWrite(ctx, input, person, at, { viewAs })`, `debriefAcceptWrite(ctx, tid, person, at, …)`, `debriefBackWrite(ctx, tid, note, person, at, …)`. Each returns `{ writes, audit, effects } | { error }`; test with `isDebriefError`;
  - the vocabulary: `ENDINGS`, `LOSS_REASONS`, `WIN_REASONS`, `FACTORS`, `LESSON_AREAS`, `EMPLOYER_DEBRIEF`, `BID_AGAIN`, `STOPPED_EARLIER`, `RIVAL_FIXED`, `MAX_FACTORS`, `MAX_LESSONS`, `labelOf`, `DEBRIEF_STATUSES`;
  - the types in `domain/gcc/debriefs/types.ts`.
  - **Until plan 035 lands, the functions are stubs:** `debriefFor` returns null and the writers refuse. Build against the types, and for the layout render a fixture `DebriefVM` in the kit preview. Do the real click-through once 035 has ticked its Phase 3 (read `app/plans/035-debrief-records.md`). Never edit 035's files; if a function behaves unlike its doc comment, note it under Blockers.
  - The capabilities in `data/access.ts`:
    - `debrief.view`: `hot`, `exec`, `member`, `dir` tenant-wide; `bid` on assigned tenders;
    - `debrief.record`: `dir`;
    - `debrief.accept`: `hot`.
- **The rules you render** (plan 035's Design has the detail):
  - **Statuses:** Due {date} · Overdue · Submitted {date} · Sent back · Accepted {date}. `vm.statusText` and `vm.statusTone` hold the words.
  - **Which form sections apply** (`vm.sections`):
    - 1 main reason, 2 factors and 5 lessons: always;
    - 3 competition: won, lost;
    - 4 the employer's debrief: won, lost, cancelled;
    - 6 next time: always; its "stopped earlier" part only for withdrawn, No-Bid, rejected.
  - **No-Bid and rejected:** `vm.mainChoices` is null. Section 1 shows the gate's reasons read-only (`vm.facts.gateReasons`).
  - **Lost:** the main reason is pre-set from the result (`draftFor`). A different pick needs a note, and both are kept.
  - **An accepted debrief:**
    - puts Stage 9 at "Lessons captured";
    - closes a lost tender;
    - makes a corrected loss reason read on every screen.
    Those changes are 035's applier. This plan only makes the writes.
- **Current behaviour:**
  - **Workspace tabs:**
    - registered by glob from `pages/gcc/workspace/tabs/*.tab.tsx` (`index.ts:39-44`);
    - reserved ids and orders are in `RESERVED_TABS` (`index.ts:11-37`): overview 10 … `bid-decision` 90, audit 100;
    - `WorkspaceTabDef` is `{ id, label, order, plan, shows(ctx), cap?, badge?(ctx), Panel }` (`tabs/types.ts:43-57`). A `cap` the viewer lacks shows the tab masked (`Workspace.tsx:106,130-136`);
    - `WorkspaceCtx` (`tabs/types.ts:15-41`) is `tenant, tenderId, row, viewer, viewAs, done, audit, now, can, check(cap, extra?), openTab`. `?tab=` deep-links.
  - **Patterns to copy:**
    - the DG3 decision (`pages/gcc/dg3/DecisionPanel.tsx`): a local `ConfirmModal` with `Effects` and "The record will say" (`pages/gcc/s3/Confirm.tsx`), `mark` for each write, `logAudit` for each entry, `toast(effects[0])`, and focus on the record heading after (`Dg3.tsx:128-138`);
    - the DG1 form (`pages/gcc/s1/parts/Dg1Form.tsx`): errors shown only after the first attempt, `role="alert"`, and the footer "Recorded with your name and the time, {time}".
  - **Stamps** come from `nextAt()` (store) so the record and its audit entry share a minute.
  - **Components:**
    - `components/tender/*`: `Callout`, `DemoTag`, `ReasonCodePicker` (toggle chips + note, `missingReason`), `StatusPill`, `When`, `AuditEntry`, `Masked`, `EmptyState`, `Tabs`;
    - `components/ui/primitives`: `Card`, `CardHead`, `KV`, `Pill`.
    - `.eq-row` / `.eq-scroll` (`styles/components.css:43-57`): cards side by side share one width and height.
  - **Library:** folder `07 Result` holds the employer's letter (`resultFiles`, `domain/gcc/library/proposal.ts:163-184`), a facsimile built by `facsimileFile(...)` / `facsimileHtml` (`domain/gcc/library/facsimile.ts`).
- **Read first:**
  - `/CLAUDE.md`, `app/plans/README.md` (the wave 11 section), plan 035's Design;
  - `ui-direction.md` §5 C, §7.3, §9 (accessibility), §10 (copy; terms: employer, bid, decision, recommendation), §13 (definition of done);
  - s1-s3-demo-spec §20 (the skeleton you fill);
  - the demo runbook (`demo-runbook.md`) scripts C and "Combining scripts".
  - **The user's UI taste:**
    - no coloured stripes;
    - status is a word in a pill;
    - every row of a kind has the same rows of text;
    - cards side by side share width and height (`.eq-row`);
    - never show the same thing twice on one screen;
    - fixed colours, each with a stated meaning.

## Design

### The tab: `debrief`, label **Debrief**, order **95** (between Bid / No-Bid and Decisions & audit)
- **`shows(ctx)`:** `debriefFor(dctx, ctx.tenderId) !== null`. A live tender never shows an empty tab.
- **`cap`:** `'debrief.view'`. The Tender Coordinator, Procurement and others get the masked tab.
- **`badge`:** the status word, only when it asks something of the viewer:
  - "Due" or "Overdue" (orange) for `debrief.record` holders;
  - "To accept" for `debrief.accept` holders when submitted;
  - otherwise none.
- **`dctx`** = `{ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done, now: <nextAt() or the demo clock> }`.

### Layout (one column; nothing side by side, so no unequal cards)
```
Debrief · Lost on Thu 5 Mar                                             [Due by Thu 19 Mar]
Recorded by the Project Director, accepted by the Head of Tendering. Both are kept, with the names and the time.
┌ What we know ─────────────────────────────────────────────────────────────── (full width) ┐
│ KV grid, 3 columns, read-only, from vm.facts:                                            │
│ Ending · Lost, Thu 5 Mar      Our place · 2 of 6 (or "Not published")   Value · SAR …    │
│ Loss reason in the result · Price    Employer's debrief · Booked Thu 12 Mar, 11:00       │
│ The letter · Regret letter → Library › 07 Result     (No-Bid: the DG2 reasons, who, when)│
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌ Record the debrief ───────────────────────────────────────── [Fill in an example] (DEMO) ┐
│ 1  The main reason      radio chips (one); Lost pre-set; a change opens "Why is it       │
│                         different from the result?" (required). No-Bid/rejected: the     │
│                         gate's reasons as read-only chips: "Recorded at DG2 by …"        │
│ 2  What else decided it up to three chips (ReasonCodePicker, no note). "3 of 3 chosen"   │
│ 3  The competition      Lost: Who won? select (rivals, Another bidder, Not known).       │
│                         Won: Our closest rival (optional). Our place and bidders, only   │
│                         when "Not published": "If the employer told us".                 │
│ 4  The employer's debrief  Held · Booked · Not offered · We did not ask; a date for Held │
│                         and Booked; "What the employer told us" for Held                 │
│ 5  Lessons              1–3 rows: Area (select) + a sentence (textarea). "Add a lesson". │
│                         Won: "What to repeat"; otherwise "What to do differently"        │
│ 6  Next time            Would we bid for this employer again? Yes · Yes, with conditions │
│                         · No. Stopped: Should we have stopped earlier? … and "What would │
│                         have let us bid?" (optional)                                     │
│ [Submit for sign-off]   Sent to Faisal Al-Harbi with your name and the time, Sun 8 Mar 10:04 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Who sees the form:** only when `ctx.check('debrief.record').ok` and the status is Due, Overdue or Sent back.
- **Everyone else:**
  - before submission: one line, "Waiting for Mohammed Al-Ghamdi (Project Director) to record it, due by Thu 19 Mar";
  - after submission: the **record**.
  - Under View as, the form shows read-only with the reason from `check`.
- **Sent back:** the form re-opens filled with the last submission (`draftFor`). A `Callout` at the top reads "Sent back by Faisal Al-Harbi, Sun 8 Mar 10:12: "{note}"".
- **Submit:**
  1. `validateDebrief`. The errors show after the first attempt, as a list with `role="alert"`, and focus moves to the list.
  2. `ConfirmModal`, titled "Submit the debrief for sign-off", with "The record will say" (the six sections in brief) and `Effects` from `debriefSubmitWrite`. That call is a preview; nothing is written until confirm.
  3. On confirm: `mark` each write, `logAudit` each entry, toast `effects[0]`, then focus on the record's heading.
- **"Fill in an example"** is shown only when `vm.example` exists, with a `DemoTag`. It fills the form (and never submits). This is a presenter control; the runbook says so.

### The record (after submission), the same six sections, read-only
```
Debrief · Lost on Thu 5 Mar                                         [Submitted Sun 8 Mar, 10:04]
Recorded by Mohammed Al-Ghamdi (Project Director), Sun 8 Mar 10:04 · Round 2
  (after acceptance) · Accepted by Faisal Al-Harbi (Head of Tendering), Sun 8 Mar 10:20
1 The main reason   Price   (lost with a change: "Technical. The result said Price: {note}")
2 What else decided it   Supplier quotes · Price level
3 The competition   Won by Hijr Al-Watan Contracting · Our place 2 of 6
4 The employer's debrief   Booked Thu 12 Mar, 11:00
5 Lessons   Pricing: "…"   Sourcing and suppliers: "…"
6 Next time   Bid for this employer again: Yes
┌ Sign-off (only for debrief.accept holders while Submitted) ─────────────────────────────┐
│ [Accept into the archive]   [Send back…]                                                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Accept:** a `ConfirmModal` with the effects from `debriefAcceptWrite`, e.g. "Accepted into the archive · Stage 9 reads Lessons captured · T-2025-270 closes".
- **Send back:** a `ConfirmModal` with a required note ("What should the Project Director add or change?"). The confirm button is disabled until the note is there, with a reason (`disabledReason`).
- **Focus:** after either, on the record heading. The status pill changes at once.
- **Words:** "Accept into the archive" and "Send back". Never "approve": gates record decisions, and a debrief is a record (ui-direction §10).

### Library: the accepted debrief as a file
- In `resultFiles` (or a sibling function the library calls), add a file **"Debrief record"** in `07 Result` for every accepted debrief, seeded or demo:
  - Made, dated at the acceptance, by the Project Director;
  - tag "Debrief";
  - a facsimile with the six sections and the sign-off line.
- Viewers without `debrief.view` see it masked (`masked: { by: c.holders('debrief.view') }`), as folder 04 masks what the role can't read.
- If `LibCtx` lacks what `debriefFor` needs (`tenant`, `viewer`, `done`), add it where `LibCtx` is built, and name the lines in the report.

## Scope
- **Files to create:**
  - `pages/gcc/workspace/tabs/debrief.tab.tsx`;
  - `pages/gcc/workspace/debrief/{DebriefPanel,WhatWeKnow,DebriefForm,DebriefRecord,SignOff}.tsx` and `debrief.css`, or a similar split;
  - `pages/gcc/dev-checks/79-debrief-tab.tsx` (about 8 rows).
- **Files to change:**
  - `pages/gcc/workspace/tabs/index.ts`: the `RESERVED_TABS` row and the comment table row only;
  - `domain/gcc/library/proposal.ts` (the Debrief record file), and where `LibCtx` is built if needed;
  - one `KitPreview` section with a fixture `DebriefVM` (won, lost, No-Bid) if you use it for layout;
  - docs: s1-s3-demo-spec §20.1–20.3 (replace the placeholders); `demo-runbook.md`: a new **Script G "Learning from the result" (about 5 min)**, one line in "Combining scripts", and any known limit;
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask):
  - `domain/gcc/debriefs/**` and `data/gcc/debriefs/**` (plan 035);
  - `data/access.ts`, the dashboards, actions and KPIs (035);
  - `pages/gcc/debriefs/**`, `pages/gcc/company/**`, `domain/gcc/company/**` (037);
  - other workspace tabs, `Workspace.tsx`, the rail;
  - new libraries; `tokens.css`.

## Demo-grade rules
- Polish where the eye lands: the form must feel quick, specific and calm. At most six short sections, sensible pre-sets, the example button.
- Add no rule. Validation and effects come from the domain; the page renders them.
- The dev check is about 8 rows.
- **Non-negotiables:**
  - the record reads the same as the archive (037) and Stage 9;
  - masking and access come from `can()` only;
  - Reset returns the seed.

## Steps

### Phase 1 — The tab and "What we know"
- [x] 1.1 `debrief.tab.tsx` (id, label, order 95, `shows`, `cap`, `badge`), and its `RESERVED_TABS` row. Acceptance: the tab appears on an ended tender (e.g. Najd T-2025-270, T-2025-255, T-2025-438) and not on a live one (the hero T-2026-118).
- [x] 1.2 The head (title, status pill, the one-line rule) and **What we know**, a KV grid in 3 columns from `vm.facts`:
  - `Money` for value;
  - `When` for dates;
  - "Not published" where the result has no place;
  - a link to Library › 07 when `facts.letter` is set (`ctx.openTab('documents')` with folder 07, if the tab supports it; else the tab);
  - No-Bid and rejected: the gate's reasons with who and when.

### Phase 2 — The form
- [x] 2.1 The six sections, as the Design has them, shown per `vm.sections`. Controls are keyboard-reachable, with labels and `aria-pressed` or radios. There is no hover-only information.
  - [x] 2.1.1 Section 1: radio chips from `vm.mainChoices`; lost is pre-set from `draftFor`; a changed main reason opens its note. No-Bid and rejected: read-only chips.
  - [x] 2.1.2 Section 2: up to `MAX_FACTORS` chips, with a counter.
  - [x] 2.1.3 Section 3: the rival select (`vm.rivals`); place and bidders only when the result has no place.
  - [x] 2.1.4 Section 4: the employer's debrief state, with its date and "What the employer told us".
  - [x] 2.1.5 Section 5: 1–`MAX_LESSONS` rows (area + textarea), with add and remove.
  - [x] 2.1.6 Section 6: bid again; stopped earlier; "What would have let us bid?".
- [x] 2.2 Pre-set from `draftFor(vm)`; "Fill in an example" (with `DemoTag`) when `vm.example` exists.
- [x] 2.3 Validation after the first attempt; `ConfirmModal` with "The record will say" and `Effects`; the writes; audit; toast; focus.
- [x] 2.4 Sent back: the note in a `Callout`, the form filled in, "Submit again for sign-off".
- [x] 2.5 Everyone without `debrief.record`: the waiting line. View as: read-only with the reason.

### Phase 3 — The record and sign-off
- [x] 3.1 `DebriefRecord`: the six sections read-only, with who and when for each round.
- [x] 3.2 `SignOff` for `debrief.accept` holders while Submitted: Accept, and Send back with its required note, both through `ConfirmModal`; focus on the record heading after.
- [x] 3.3 Acceptance in Najd, your own browser tab:
  1. As Mohammed Al-Ghamdi (Project Director), T-2025-270 → Debrief. Price is pre-set, and "Fill in an example" fills the form. Submit: the status reads "Submitted {time}", and the toast names Faisal Al-Harbi.
  2. As Faisal Al-Harbi (Head of Tendering), send it back with a note.
  3. As Mohammed, the `Callout` shows; change one lesson and submit again (Round 2).
  4. As Faisal, accept. The status reads Accepted; Stage 9's tracker node reads "Lessons captured" (035's applier); the tender's Decisions & audit shows the four entries.
- [x] 3.4 T-2025-438 as Faisal: it arrives Submitted (seeded); accept it from the tab.

### Phase 4 — The Library file
- [x] 4.1 "Debrief record" in 07 Result for accepted debriefs (seeded T-2025-255; the live one after 3.3), with a facsimile that opens in the viewer; masked for the Tender Coordinator.

### Phase 5 — Checks and docs
- [x] 5.1 `dev-checks/79-debrief-tab.tsx`, about 8 rows, across the five tenants where it makes sense:
  1. the tab shows exactly on tenders with an ending;
  2. the tab's `cap` is `debrief.view`;
  3. the badge rule for `dir` and `hot`;
  4. the example, when present, validates;
  5. the Debrief record file exists ⇔ the debrief is accepted;
  6. it is masked without `debrief.view`;
  7. `RESERVED_TABS` has `debrief` at 95;
  8. no tab id or order collides.
- [x] 5.2 Browser, at 1440 and 1280, light and dark, keyboard only for one full submit and one accept, no console errors. Also check:
  - Corniche T-2025-120 (AED, UAE rivals);
  - a No-Bid after script C (Demo › "Start: DG2 committee", record a No-Bid on T-2026-097): the tab shows the DG2 reasons read-only and "Should we have stopped earlier?";
  - the CEO reads the record and has no sign-off buttons;
  - the Bid Manager (Omar Siddiqui) reads only their own tenders' debriefs;
  - the Tender Coordinator gets the masked tab.
- [x] 5.3 Settings › Reset demo returns T-2025-270 to Due and T-2025-438 to Submitted.
- [x] 5.4 Docs:
  - spec §20.1–20.3 (the tab, recording and sign-off, what follows an accepted debrief);
  - runbook Script G (steps as in 3.3, with what to say: "the reasons stop living in e-mails", "the Head of Tendering signs off, both names are kept"), plus a line in "Combining scripts" (after script C: the No-Bid's debrief).
- [x] 5.5 typecheck and build pass; `/dev/checks` has no failing row in any tenant.

## Data and derivation
- **No new facts.** Everything comes from `domain/gcc/debriefs` (035).
- **No new `done` keys:** the writers return 035's keys (`debrief:`, `debrief-back:`, `debrief-ok:`), which Reset clears.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants
- [x] Record → send back → re-submit → accept works as Mohammed and Faisal in Najd, with names and times on every step, and the audit tab shows each
- [x] The form adapts to won, lost and stopped endings; the example fills it; validation speaks in sentences
- [x] The accepted debrief appears in Library › 07 Result
- [x] Access: only the Project Director records; only the Head of Tendering signs off; others read or see it masked
- [x] Light and dark, 1440 and 1280, keyboard-only pass; Reset returns the seed
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Executor, 2026-09-30. Built against the stubs; verified once 035 had ticked its Phase 3, and in fact all its phases.)

- **Changed files:**
  - **New:**
    - `pages/gcc/workspace/tabs/debrief.tab.tsx`: id `debrief`, order 95, cap `debrief.view`. `shows` is `hasEnding` (`endingOf` on the lifecycle merged with `done`), so the masked tab still shows without `debrief.view`. The badge is `debriefBadge`.
    - `pages/gcc/workspace/debrief/`:
      - `DebriefPanel.tsx`: the panel and `DebriefView`, the body the kit also renders. Focus goes to the record heading after each write;
      - `WhatWeKnow.tsx`: the head and What we know;
      - `DebriefForm.tsx`: the six sections, validation, the confirm step, and `applyWrite` (`mark`, `logAudit`, toast);
      - `DebriefRecord.tsx` and `SignOff.tsx`;
      - `format.ts`: the badge rule, status glyphs, the `RECORDABLE` statuses, and injectable writers;
      - `fixtures.ts`: kit-only fixtures for a loss due, a loss sent back, a win accepted and a No-Bid submitted;
      - `debrief.css`.
    - `domain/gcc/library/debrief.ts`:
      - `debriefLines(vm, submission)`: one set of words for the tab's record, its "The record will say", and the file;
      - `debriefFiles(c)`: the Debrief record in 07 Result;
      - `dayText` and `stampText`.
    - `pages/gcc/dev-checks/79-debrief-tab.tsx`: 9 rows (the plan's 8, plus "the record and the archive say the same").
  - **Changed:**
    - `domain/gcc/library/proposal.ts`: `resultFiles` returns the letter (the old body, now `letterFiles`) plus `debriefFiles`; one import; a header comment line. `LibCtx` already had `tenant`, `viewer` and `done`, so nothing changed where it is built.
    - `pages/gcc/workspace/tabs/index.ts`: the `RESERVED_TABS` row and the comment table row.
    - `pages/gcc/dev/KitPreview.tsx`: one `DebriefKit` section, with four imports.
    - Docs: s1-s3-demo-spec §20.1–20.3. `demo-runbook.md`: Script G, a "Combining scripts" line (the No-Bid after C), and two known limits.
    - This plan's row in `app/plans/README.md`.
- **Verification:**
  - typecheck and build pass. The build's only warning is the `domain/gcc/s1` circular-chunk one, which is older than wave 10.
  - `/dev/checks` has no failing row on any panel in any of the five tenants. Plan 036's 9 rows pass in each:
    - Najd: 57 of 209 tenders ended; the badges are due 4, overdue 5, submitted 2, accepted 46;
    - Corniche 41 ended, Dafna 31, Batinah 46, Qurain 56;
    - the Debrief record ⇔ accepted, in every tenant;
    - masked for the Tender Coordinator: 46 files in Najd, 36 in Corniche.
  - **Browser** (Playwright on my own dev server, port 5186), with no console errors on any run:
    - **3.3 in Najd:**
      - as Mohammed Al-Ghamdi, T-2025-270 opens Due with Price pre-set. Fill in an example fills the form. The confirm step shows the effects and "The record will say". The status reads "Submitted Sun 8 Mar, 10:00", the toast reads "Sent to Faisal Al-Harbi for sign-off.", and focus lands on "Debrief record";
      - as Faisal, the tab badge reads "To accept". Send back stays disabled with the writer's reason until the note is there. The toast reads "Sent back to Mohammed Al-Ghamdi with your note.";
      - as Mohammed, the badge reads "Sent back". The callout carries the note and the form is filled; one lesson changed, then round 2;
      - as Faisal, accept: "Accepted Sun 8 Mar, 10:03", and both names and times are on the record;
      - Overview's Where it stands reads "Lessons captured: Yes"; the tender is closed as lost, with a platform "Lessons captured" entry. 07 Result holds "NCWS-PRJ-2025-0367 Debrief record.pdf". Decisions & audit shows the four entries.
    - **3.4:** T-2025-438 arrives "Submitted Thu 5 Mar, 11:40". Faisal accepts it: "It counts in Debriefs accepted and in Why bids stopped".
    - **4.1:** T-2025-255's Debrief record opens in the viewer: the sections, "Won by Istria Aqua Engineering", and the sign-off. For Aisha Al-Qahtani (Tender Coordinator) the row is listed "Figures masked", and the facsimile masks the content and names who can read it.
    - **5.2:**
      - Corniche T-2025-120 as Graham Whitfield: AED 248.0 M, "Our place: Not published", the three UAE rivals, and an example that validates;
      - a No-Bid after script C: the preset, one more position (Oppose), then Faisal records a No-Bid on T-2026-097. The tab opens Due by Sun 22 Mar, with "Decided at DG2", the DG2 lessons, the DG2 reasons read-only, "Should we have stopped earlier?" and "What would have let us bid?". The example validates and submits;
      - the CEO reads T-2025-438's record with no sign-off buttons;
      - Omar Siddiqui reads T-2025-270, with the waiting line before it is submitted;
      - the Tender Coordinator gets "Debrief is masked for your role";
      - the hero T-2026-118 has no Debrief tab;
      - View as Mohammed (from Faisal): every control is disabled, with "Viewing as Mohammed Al-Ghamdi. Read only.";
      - keyboard only, at 1280 in the dark theme: a full submit typed from scratch on T-2025-262 (arrow keys in the radio groups, Space on the factor chips, typing to pick in the selects), then an accept. Focus lands on the record heading after each;
      - 1280 light and 1440 dark on T-2025-270, T-2025-438 and T-2025-262, with no horizontal scroll on the page or in the main column.
    - **5.3:** after a submit on T-2025-270 and an accept on T-2025-438, Demo › Reset demo… › Reset this company leaves no `debrief*` key. T-2025-270 reads Due by Thu 19 Mar again, T-2025-438 Submitted Thu 5 Mar, 11:40, and T-2025-255 Accepted Sun 1 Mar, 14:00.
    - The kit preview (`/dev/kit`, Debrief tab) was checked in light and dark, at 1440 and 1280.
- **Deviations from plan:**
  - **Step 3.3's "tracker node reads Lessons captured":** a lost debrief, once accepted, closes the tender, and the tracker ends in "Stopped here" at Results, as it does for the seeded T-2025-255. "Lessons captured: Yes" shows in Where it stands. That is 035's applier and the tracker, not this tab; the runbook says so.
  - **Nothing shown twice:**
    - What we know drops "Ending", because the head says it;
    - it shows the employer's debrief date only until a submission restates it;
    - the record shows our place only when the employer told us (What we know already shows the result's);
    - the waiting line drops the due date, which the status pill carries.
  - **Badge:** "Sent back" also shows for the Project Director. It is the status word and asks something of them; dev check row 3 covers it.
  - **Rounds:** the record shows the latest round, "Round n", and its acceptance. The contract keeps only the latest submission and a send-back later than it, so earlier rounds are in Decisions & audit.
  - **Factors:** chips that reuse `ReasonCodePicker`'s classes (`rcp-code`, `rcp-box`), because that component always renders a note. The main-reason chips are native radios in the same style.
  - **The shared words** live in `domain/gcc/library/debrief.ts`, beside `proposal.ts`, so the tab and the file read one function.
  - **The library's reader:** a viewer without `debrief.view` gets no view model of their own for the file, so whether an accepted debrief exists is read as the tenant's Head of Tendering (`firstWithRole(tenant, 'hot')`). The content shows only if `c.can('debrief.view')`.
  - **Section numbers** run 1 to n over the sections that apply (a No-Bid reads 1–4), not the fixed 1–6.
  - **What we know's close note** is labelled "Why it closed" for both withdrawn and cancelled, because the note is ours, not the employer's words.
- **Blockers / questions:** none. 035's functions behave as their doc comments say. One reading to note: `debriefFor` returns a view model to anyone who can open the tender, without checking `debrief.view`, so the tab relies on its `cap` for masking, which it has.
- **Follow-ups noticed (not done):**
  - In Najd every bid has the one Bid Manager (the generator assigns `{tenant}.bid`), so "a Bid Manager reads only their own" can't be shown there. 035's check 15 covers the rule.
  - The library's masked row reads "Figures masked" (`LibraryBrowser`, `FileViewer`); for a Debrief record, "Content masked" would be truer.
  - On a No-Bid's Debrief tab, the workspace rail's DG2 card repeats who decided and when, which What we know also shows.
  - The spec's §17 script table lists A–F; Script G could join it.
  - Najd's home "Needs your action" shows 5 of 9 rows by default, so the debrief sign-off rows sit under Show all. The runbook says so.
