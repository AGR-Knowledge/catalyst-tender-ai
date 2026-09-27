# Plans

The orchestrator session writes the plans; executor sessions implement them. The working rules are in `/CLAUDE.md` under "How work is organised".

## Index

| # | Plan | Wave | Depends on | Status |
| --- | --- | --- | --- | --- |
| 001 | [Motion pass](001-motion-pass.md): easing/duration tokens, exit animations for drawer/modal/toast, press states, popover origin, theme crossfade, reduced motion | — | — | DONE (2026-09-23) |
| 002 | [Tenancy foundation and GCC formats](002-tenancy-foundation.md): active tenant, tenant-scoped demo state, five GCC tenants, money/FX/calendar helpers, brand accent, legacy gating | 1 | — | DONE (2026-09-25) |
| 003 | [Roles, people and permissions](003-roles-people-permissions.md): new role keys, people per tenant, grouped persona switcher, `can()` and masking, admin gating, View as, demo scope, GCC nav model | 1 | 002 | DONE (2026-09-25) |
| 004 | [GCC seed data](004-gcc-seed-data.md): company data, credential vaults, fit models, registers, history, hero tender record and BOQ, real-document records | 1 | 002 | DONE (2026-09-25) |
| 005 | [Hero tender booklet PDF](005-hero-itt-pdf.md): dev-only generator for the synthetic KSA booklet, with page-anchor verification | 1 | — (reads gcc-demo-data §4) | DONE (2026-09-25) |
| 006 | [Shell, sidebar and dashboard kit](006-shell-and-dashboard-kit.md): nine-stage sidebar with Settings at the bottom, AG Grid + Recharts, dashboard layout components (period, tiles with ⓘ, flow, actions, Table/Graph, tracker), registries, DG2/DG3 authority, Proposal Manager | 2 | 002–005 | DONE (2026-09-26, fixes in plan 020) |
| 017 | [Tender lifecycles and dated history](017-lifecycle-data.md): stage logs, gate records, Stage 4–9 register, step facts, generated 12-month history hitting the period targets, data port | 2 | 004; 006 Phase 1 for its last phase | DONE (2026-09-26, fixes in plan 020) |
| 007a | [Stage 1 and DG1 rules](007a-stage1-dg1-rules.md): eligibility vs the vault with the JV scenario, fit and PQ-fail cap, bond, key dates and flags, validation queue, pipeline and radar, addenda, triage, queries, DG1 queue, pack and decision rules. No screens | 2b | 004 | DONE (2026-09-26, fixes in plan 020) |
| 008a | [Stage 2 sourcing rules](008a-stage2-sourcing-rules.md): supplier masters, packages and coverage bar, shortlists with the screening guardrail, RFQ drafts and clock, tracking, levelling, best fit, clarifications, Supplier Portal view. No screens | 2b | 004; 017 for its Phase 8 | DONE (2026-09-26, fixes in plan 020) |
| 009a | [Stage 3 and DG2 rules](009a-stage3-dg2-rules.md): win probability, cited competitors, contributor inputs, the pack with freshness and re-run, positions, quorum 3 of 5, the Head of Tendering's approval, conditions, letter, re-open. No screens | 2b | 004; 007a for Phase 7; 017 for Phase 9 | DONE (2026-09-26, fixes in plan 020) |
| 007b | [Stage 1 and DG1 screens](007b-stage1-dg1-screens.md): radar, intake steps, intake queue with the conflict pattern, Requirements / Eligibility & fit / Key dates / Queries tabs, screening and triage, the DG1 evidence pack and decision form, calendar, GCC upload | 4 | 007a, 019, 021 | DONE (2026-09-27, reviewed) |
| 008b | [Stage 2 screens and the Supplier Portal](008b-stage2-screens.md): packages and coverage, shortlists with the screening guardrail, RFQs and the clock, package board and nudges, simulated replies, levelling, best fit, clarifications, suppliers, the Supplier Portal preview | 4 | 008a, 019, 021 | DONE (2026-09-27, reviewed) |
| 009b | [Stage 3 bid pack, DG2 and the contributor forms](009b-stage3-dg2-screens.md): the pack 9.1–9.10 with re-run and issue, Inputs tab and forms from My requests, positions and the members panel, the Head of Tendering's approval, conditions, decline letter, re-open | 4 | 009a, 019, 021 | DONE (2026-09-27, reviewed) |
| 010 | [Company: the credentials vault and the renewal loop](010-company.md): Credentials with the renewal upload that re-checks eligibility everywhere, capability profile, bank facility, teams and partners | 5 | 007a, 007b, 013, 015 | DONE (2026-09-27, reviewed) |
| 011 | [Platform Console and break-glass](011-platform-console.md): separate operator shell with counts and health only, the break-glass request that the tenant's Head of Tendering sees, and the tenant audit log | 4 | 006, 015 | DONE (2026-09-27, reviewed) |
| 012 | [Arabic intake](012-arabic-intake.md): `BilingualValue`, Plex Sans Arabic, the English value with the Arabic source on 007b's screens, "Arabic text prevails", "Read in English", OCR pages named | 5 | 007b, 019, 023 | DONE (2026-09-27, reviewed) |
| 013 | [Stage dashboards and My requests](013-stage-dashboards.md): one dashboard per stage (1–9), shared by its owner and the Head of Tendering; Finance/HR requests | 3 | 006, 017, 020 | DONE (2026-09-26) |
| 014 | [Presenter controls and the Compare tenants lens](014-presenter-controls.md): the Demo menu, four scenario presets, Advance agent work, Advance to Stage 3 for T-2026-061 and T-2026-042, Compare tenants | 5 | 007b, 008b, 009b, 021, 022, 023 | DONE (2026-09-27, reviewed) |
| 015 | [Portfolio dashboards](015-portfolio-dashboards.md): Head of Tendering, CEO and Bid Manager homes; PF KPIs, decision funnel, approvals, stage graph with drill-down | 3 | 006, 017, 020 | DONE (2026-09-26) |
| 016a | [Polish: rules, counts and seed fixes](016a-fixes-rules-data.md) carried from waves 3–5: screening totals, the DG3 chip, Stage 8 facts after DG3, DG1 re-open after Stage 3 entry, levelled totals for `see.quotes.summary`, the workspace audit tab, seed slips | 6 | waves 1–5 | DONE (2026-09-27, reviewed) |
| 016b | [Polish: the top bar, the dashboard kit, workspace and gate screens](016b-fixes-screens-copy.md): the top bar at 1280 and 1440, table heights, stage chips, My requests row click, preset confirmation, Arabic file names, copy slips | 6 | waves 1–5 | DONE (2026-09-27, reviewed) |
| 016c | [Script QA](016c-script-qa.md): scripts A–F end to end (spec §17, §19), the presenter runbook, the spec brought up to date | 6 | 016a, 016b | DONE (2026-09-27, reviewed) |
| 018 | [DG3 approval](018-dg3-approval.md): the Head of Tendering's final gate (evidence left, decision right), send back to Compliance and re-issue, Qurain's guarantee catch | 5 | 009b, 013, 015, 017 | DONE (2026-09-27, reviewed) |
| 019 | [Tender Workspace and kit part 2](019-tender-workspace.md): `/tenders/:id` with header, tab registry, rail, Overview and Decisions & audit; RecommendationCard, OverrideModal, SourceChip (PDF at the page), Callout, Sheet, RequestButton, AuditEntry …; ⌘K tender search | 3 | 006, 017, 007a, 009a, 020 | DONE (2026-09-26) |
| 020 | [Review fixes](020-review-fixes.md): the 2026-09-26 review of 006, 017, 007a, 008a and 009a; five parallel lanes (A shell and access, B lifecycles and seed, C Stage 1, D Stage 2, E Stage 3) | 2c | 006, 017, 007a, 008a, 009a | DONE (2026-09-26) |
| 021 | [Demo state and rule fixes](021-demo-state-and-rule-fixes.md): demo actions (DG1, Stage 2 progress, pack, positions, DG2) merged into the lifecycles so every dashboard shows them; DG1 rounds, DG2 conditions masked and the other rule bugs from the 020 review | 3 | 017, 007a, 008a, 009a, 020 | DONE (2026-09-26) |
| 022 | [Second demo tender, UAE](022-demo-tender-uae.md): Corniche's Abu Dhabi hospital MEP (T-2026-061), English; its own PDF, catches, eligibility, packages, quotes and pack | 4 | 019, 021 | DONE (2026-09-27, reviewed) |
| 023 | [Third demo tender, Oman, Arabic](023-demo-tender-oman-arabic.md): Batinah's Sohar–Buraimi road dualling (T-2026-042), an Arabic PDF with scanned pages; bilingual extraction, catches, eligibility, packages, quotes and pack | 4 | 019, 021 | DONE (2026-09-27, reviewed) |
| 024 | [Administration](024-administration.md): users and roles with View as, committees and gates, sources, the fit model what-if with live impact, targets and SLAs, prospect branding | 5 | 003, 006, 011, 013, 015 | DONE (2026-09-27, reviewed) |

**Wave 6 review of 016c (orchestrator, 2026-09-27): accepted. Wave 6 is committed as one milestone.**
- Typecheck and build pass. `/dev/checks` has no failing row in any tenant, with the same counts as after 016a and 016b.
- The Findings table has 31 rows: 24 fixed and 7 left. The three findings carried from the 016a/016b review (rows 24–26) are fixed.
- Browser checks at 1440 light:
  - "Start: DG1 due" as `najd.proc` switches to Faisal Al-Harbi and lands on DG1;
  - as `najd.bid`, levelling on T-2026-104 names "VAT removed" without its rate, and quoted prices are masked.
- The runbook (`demo-runbook.md`) and the spec changes (§1 M-6, §17, §19) were read. The confidentiality scan of the whole diff is clean: no prices or costs, and only synthetic people.
- Orchestrator fix: spec §3 no longer calls the CEO the DG2 gate chair. The CEO is a committee member, and the Head of Tendering approves DG2 and DG3.
- **Left, open for a follow-up plan** (each is in the runbook's known limits):
  - 016c finding 1: the hero reads "Intake · Validating" until DG1, after its fields are resolved;
  - finding 10: Stage 2, Stage 3, DG2 and DG3 records are stamped 10:00, while the audit log runs on the minute clock;
  - finding 20: the Jezzine tender is in Batinah's upload list;
  - finding 30: T-2026-042's Overview and DG1 pack show a page chip, not the Arabic quotation, so §19's Arabic box stays open;
  - findings 8, 9 and 27: keyboard focus falls to the top of the page after a card is resolved or a gate is decided.

**Wave 6 review of 016a and 016b (orchestrator, 2026-09-27): both accepted.** Committed with 016c, which started before this review and shared the checkout.
- Typecheck and build pass. `/dev/checks` has no failing row in any tenant: Najd 729, Corniche 320, Dafna 301, Batinah 309 and Qurain 324 passing targets.
- Browser checks:
  - the top bar at 1280 light and 1440 dark;
  - Corniche `/stages/3` fits its one row;
  - a My requests row, as `najd.fin`, opens the T-2026-101 finance input form;
  - a preset runs at once on a fresh company and asks when there is activity.
- Orchestrator fixes:
  - `TenderGrid.tsx`: a grid with rows fits them exactly (1 to 10); only an empty grid keeps three rows for its message. Before, a one-row table showed two blank rows with the scrollbar between them.
  - `DemoMenu.tsx` and `Modals.tsx`: a preset keeps the prospect branding, which is setup and not demo activity. Branding alone doesn't count as a demo in progress. Settings › Reset demo still clears it.
  - The preset confirm reads "It first clears the actions recorded in this demo for {name}", using the branded name. This fixes the "Co.:" punctuation.
- Decisions:
  - **016b 2.2:** the card keeps its 491 px minimum, so Table ⇄ Graph never moves the page (dashboards.md §1).
  - **016a 2.5:** it can't be shown with the seed data, because no persona has only `see.quotes.summary`. Accepted as proven by the dev check.
  - **Najd T-2026-119's questions deadline in the expected Eid closure** stays: the screen flags it, which shows the calendar rule. It is a talking point for the runbook.
- **Carried to 016c** (sent to its session):
  - Presets land on a page the current persona may not open. For example, "DG1 due" as `najd.fin` shows "This page isn't part of your role".
  - The same approved-list slip as P-04 appears in T-2026-104's P-03 and P-06, Corniche's T-2026-044 and Qurain's T-2026-058.
  - For `see.quotes.summary` without `see.quotes`, the levelling trace shows its rates ("VAT 15% removed"), so a Bid Manager can work back to the quoted price.

**Wave 5 review (orchestrator, 2026-09-27): 010, 012, 014, 018 and 024 accepted.**
- Typecheck and build pass on the combined checkout. `/dev/checks` has no failing row in any tenant (Najd 722, Corniche 314, Dafna 296, Batinah 303, Qurain 319 passing targets; the new panels 66-company, 73-arabic, 46-presenter, 97-dg3 and 67-admin included).
- Browser at 1440 × 900:
  - **010:** as Faisal, Request renewal on Zakat; as Sultan, My requests › Open credentials lands on the Zakat panel › Upload renewal; the toast names both re-checked bids, and "Credentials at risk" goes from 2 to 1.
  - **018:** T-2025-305 approved from `/dg3?tender=`; the action row leaves and DG3 approved goes from 4 to 5.
  - **014:** "DG1 due" lands on `/dg1?tender=T-2026-118`; Compare shows 82/63/71/38/78.
  - **012:** T-2026-042's Requirements carry the Arabic beside each value, the §7 flag and a labelled Read in English sheet.
  - **024:** the Administration cards and Branding; the CEO's sidebar shows Administration as a header over Audit log only.
- **Orchestrator fixes before commit:**
  - 010: a renewed credential's My requests row keeps its bid and due date. It read the bid after the renewal had cleared the line, so the tender dropped and the due moved from 26 Apr to 16 Apr (`requests.ts` reads the bid as it stood before the renewal).
  - 014: the Demo menu fits the window (`calc(100vh - 176px)`), so Views and Reset show at 1440 × 900 without a scroll. Compare's grid is 1100 px wide at minimum, so all five companies fit at 1440; at 1280 it still scrolls inside the card.
- **Decisions:**
  - 012 Q1: access unchanged. The Coordinator uploads in script E (logging intake is their job, with `tender.create`), then the Bid Manager or the Head of Tendering carries on.
  - 012 Q2: the hero keeps "Arabic text prevails (§27)", as gcc-demo-data §4.1 says it should, even on an English booklet.
  - 018: the send-back request opens `/dg3?tender=` (`requests.actions.ts`) and closes once the pack is re-issued or DG3 is decided (`requests.ts`). The guarantee amount is masked with the price.
  - 024: the one-line `navFor` change: any entry keeps its company-wide children under a header that isn't a link, which changes only the CEO's sidebar.
  - 010: the vault reads credential states company-wide, as the Head of Tendering sees them; bids not shared with the viewer show their ID only.
  - 014: the preset audit is a "Presenter (demo control)" summary, and each step stays under the named person.
  - All other deviations in the five reports are accepted.
- **Carried to 016:**
  - 012: Arabic file names outside the Arabic display (upload modal, toast, Documents list) fall back to the system font; the PDF viewer can't highlight Arabic words; the Documents card lacks the Arabic title.
  - 014:
    - the seeded inputs of T-2026-061 and T-2026-042 are stamped before the demo's DG1 Pursue;
    - a DG1 re-open after Advance to Stage 3 leaves the pack open by direct link;
    - presets reset the company with no confirmation;
    - the `/demo/compare` title lives in `Header.tsx` rather than `screens.ts`.
  - 018: while the pack is back with Compliance, the Head of Tendering's DG3 chip still reads "waiting on me"; a tender approved in the demo has no Stage 8 facts; the confirm's "The record will say" repeats the name.
  - 024: at 1280 the company switcher shows only the mark, so the prospect's name shows only at 1440; more accent colours; each target in one home.

**Wave 4 review (orchestrator, 2026-09-27): 007b, 008b, 009b, 011, 022 and 023 accepted.**
- Typecheck and build pass. `/dev/checks` passes in all five tenants with no console errors (Najd 665, Corniche 257, Dafna 239, Batinah 246, Qurain 262 targets). `demo-itt:cbhh` 66/66, `demo-itt:ilra` 46/46, `hero-itt` 57/57; the demo PDFs carry pinned dates and rebuild byte-identical.
- Browser, as Omar (Najd Bid Manager): after a real DG1 the RFQ clock reads 24 h and the kick-off reads "11 of 11 packages issued, within the hour of DG1"; the hero's Inputs tab appears at Stage 2 with the six kick-off inputs; Request estimate lands in Tarek's My requests, whose "Open form" opens the form unmasked. Corniche's /packs shows only T-2026-029 until T-2026-061 reaches Stage 3.
- **Orchestrator fixes before commit:**
  - 007b: a DG1 override is a decision against the recommendation in either direction (`rail.ts`); a DG1 Hold request leaves My requests once the hold no longer stands; requirement rows match their extraction item by name before page; the post-confirm scroll respects reduced motion; no dead "Draft query" button; typed thresholds read from `STAGE_BANDS` and `RFQ_CLOCK_HOURS`.
  - 008b: the RFQ clock never runs before DG1 (`rfqClock`, `rfqIssueLag`); a declined portal quote isn't "submitted"; "within the hour of DG1"; typed numbers in six Stage 2 screens read from `data/gcc/s2`; the split modal keeps the package's currency; the package board's send refusal comes from `refusal()`.
  - 009b: condition notes and the DG2 reason are masked without `see.positions`; the note and nudge controls hide for roles without the right; **contributors are invited** (`Lifecycle.invited`, `demo/90-invited.apply.ts`: the DG1 team, input owners and request recipients), so an input owner can open the tender; **seeded packs wait for the pack** (`s3/ready.ts`, `seededPackReady`: a register row at S1 or S2 shows no seeded pack or inputs until `pack-ready:{TID}`); at Stage 2 the Inputs tab requests the kick-off inputs, and My requests lists them.
  - 011: demo-control audit entries read "Presenter (demo control)"; the Revoke refusal names the Head of Tendering; hours and agent counts come from facts; the focus trap covers form fields; `writeTo` accepts only GCC tenants; the operator lands on /platform.
  - 022 and 023 (a data-fix pass the user approved): the bond rule reads a rate against a fixed amount (T-2026-042's VAL-042-1, the higher bond until resolved; 160 of 160 other readings unchanged); a fixed bond counts as a bond in pack 9.4 and fit; fictional names checked against real firms (Crescent Bay campus, Oskerwyn, Galdrevin); medical gas to HTM 02-01 or NFPA 99; the Arabic booklet's bridge scope, stamps and signatures corrected; `toDateWeeks` 0; the parent-entity field cites p. 2.
- **Decisions:** the rule extension above (022 extends, 023 reuses). 011 Q2: the second approver keeps the fictional name (synthetic, not a client's staff). Contributor invitations derive from the demo, not the register. The hero has no seeded pack: its pack is built in the demo.
- **Dashboard layout (user, 2026-09-26):** bars per stage with a Tenders | Value | Weighted switch, a target line only where a target exists, a bar click drills; tiles on top, the flow as one line, Graph or Table at two-thirds width with "Needs your action" beside it, never both. Recorded in dashboards.md.
- **Carried to wave 5:** 014's "Advance to Stage 3" writes `pack-ready:{TID}` with the stage move. To 016: `see.quotes.summary` levelled totals, Screening totals over hidden rows, `UploadGcc` `canOpen`, the workspace audit tab's missing Stage 2 entries, the Dates tab's bond validity for T-2026-061, dashboards.md's Batinah note, P-04's AVL, the My requests row click.

**Wave 3 review (orchestrator, 2026-09-26): 015, 013, 019 and 021 accepted.**
- Typecheck and build pass. `/dev/checks` passes in all five tenants with no console errors: Najd 124 lifecycle, 16 demo-state, 82 portfolio, 10 workspace, 36 stage, 131 Stage 1, 55 Stage 2 and 97 Stage 3 targets; the other four tenants pass every panel. Three review agents read each plan's code against its plan; nothing high.
- Browser, as Faisal (Najd): the home dashboard, the hero's workspace (the p. 4 chip opens the booklet at the page with the value highlighted), ⌘K; as Joseph (Procurement Lead): T-2025-329 masks price, margins and the blocker, T-2026-121 is "not here". DG1 Pursue written through `dg1Write` moves the hero to 2 · Sourcing · Packaging with Joseph as owner, and Reset returns it to Stage 1.
- **Orchestrator fixes before commit:**
  - `/dashboard` titled "Not found" (screenHead); tile labels split mid-word beside an owner tag (dashboard.css wraps the tag instead); the workspace top bar says "Tender workspace" rather than repeating the ID.
  - The empty-stage message (013 Q1): an `empty` hook on the dashboard spec, `TableZoneVM` and `TenderGrid`; stage dashboards say "No tenders are in Stage 3 now. Tenders arrive here after sourcing."
  - Cross-plan: a re-opened gate no longer counts as decided (`standingGate` in the rail, PF's hero hint and Stage 2's RFQ clock); "0 of 0 RFQs sent" reads "Packages being set up" / "No RFQs sent yet"; 013's waiting rows sort on 015's scale.
  - Masking: DG2 approval rows show "With the committee" without `see.positions`; DEC-4, PRC-3 and `s3.weighted` check access tender by tender; the CFO's seed comment no longer states the margin figure (seed and 017 copy) and `dg2RecordFor` takes `canSeePositions`; gate notes "against the majority" are masked without `see.positions`; demo audit events gain `sensitive` and the workspace timeline masks them.
  - Rules: the unnamed JV partner is tried with the company leading first (Rafid still fails 11 lines, so the note stays required); an RFQ due at 10:00 is not yet due at 10:00; the JV effect line names the partner.
  - Workspace contract for wave 4: tab panels and the rail sit in an error boundary; `WorkspaceCtx.check(cap, extra?)` returns the refusal sentence.
  - Renewal requests record who asked (`renewal-requested:` holds `{ at, byId }`).
  - State tiles: a `periodAware` flag (PF-1 only); the ⓘ of other state tiles says the period doesn't change them; dashboards.md §2 amended ("4 in · 9 out": 015 Q1 accepted as the seed reads).
- **Decisions:** 015 Q1: 9 out accepted. 013 Q2: see above. 013 Q3: Aisha reads 10 and 14 min (she isn't cleared for the restricted lane; a tile never counts what its table hides). 019: no hero addendum (the addendum story is T-2026-097's, script C). 021 deviations 1, 3, 4, 5 and 7 accepted; `levelWrite` is now `(tenant, tenderId, quoteId, adjKey, state, byId, done, amount?, note?, adjustment?, at)`.
- **Carried to wave 4:** 007b offers DG1 Re-open only on demo decisions and keeps the recommendation visible beside an override (spec §5.2); per-source `doc` on SourceChip for addenda; `EligibilityLine` highlights `termsOf`; 009b passes `{ canSeeMargin, canSeePositions }` to `dg2RecordFor` and sets `sensitive` on position audit events; the `mixWrite`/`packagingWrite`/`gapWrite` pursue guards; small copy items (the CEO's delegate wording, "requested by you", "ranked 2 of 5", Stage 7 "Most", search "First 8", "With nobody now" on closed tenders, rail key dates via `countdownText`) go to 016.
- **Demo tenders (user, 2026-09-26):** at least three, all GCC, one Arabic. The hero (KSA, English), 022 (UAE, English, Corniche) and 023 (Oman, Arabic, Batinah). The Lebanese scanned tender leaves the demo path. The orchestrator wrote `domain/gcc/documents.ts` (`documentFor`) so the Stage 1 screens and the data plans don't share files.

**Dashboards replan (orchestrator, 2026-09-25).** The user's brief for the Head of Tendering replaced the sketch, and it applies to every role: [dashboards.md](../../docs/07-product-design/agr-product-definition/dashboards.md). Consequences here:
- **006** is rewritten as the shell, the sidebar and the dashboard kit.
- **017** (lifecycles) is new.
- **015** and **013** become the portfolio and stage dashboards, and come **before** the stage working screens (the user chose "dashboards first").
- **018** (DG3 lite) and **019** (tender kit part 2) are new.
- The stage lanes move to wave 4.

**Rules lanes (orchestrator, 2026-09-25).** To use the time while 006 and 017 run, each stage lane is split in two:
- **a:** rules, records and a dev check, with no screens. It runs now.
- **b:** screens on top of the rules, written after 006 and 019 land. It adds no logic.

The a-plans own new folders only, and publish their `done`-key conventions so the b-plans and the other lanes agree.

**Other decisions (orchestrator, 2026-09-25):**
- Najd's Stage 1 shows **12**, not 5, answering 017's question: every register row has a lifecycle (dashboards.md §12.2, and plans 015 and 017, updated).
- Plan 017 gained `s3.positions.bySeat` before it built Phase 1, because 015's `dg2.position` needs to know *which* seats have recorded a position.
- The hero's coverage bar is derived from the seed (49.7 / 32.3 / 16.0 / 2.0; gcc-demo-data §4.8 corrected).

**Commits (user rule, 2026-09-25):**
- Work goes on the `gcc-demo` branch, never `main`.
- The orchestrator commits and pushes after it reviews each plan. Messages are one or two lines.
- Executors don't commit (see CLAUDE.md).

**Plan 003 review (orchestrator, 2026-09-25): accepted.**
- Typecheck passes; the executor's 43 acceptance checks passed with no console errors.
- Deviations 1–15 accepted, including:
  - the empty `Dashboard.tsx` entries;
  - the committee seat carried across tenants;
  - "invited" and "own" scopes counting for navigation;
  - the Catalyst operator in each GCC persona menu.
- Its two open items are decided in plan 006:
  - Finance and HR gain `company.view`;
  - Sector Head sectors use the tenant's sector names.
- Superseded by the dashboards replan (and changed in 006):
  - DG2 is approved by the Head of Tendering (the CEO becomes a member, seat `ceo`);
  - `NAV_GCC` becomes the nine-stage sidebar.

**Plan 004 review (orchestrator, 2026-09-25): accepted, except step 4.2's PDF copy.**
- Typecheck and build pass. The seed panel meets every target on all five tenants, with 0 console errors:
  - Najd: 18 of 18;
  - Corniche 63, Dafna 71, Batinah 38, Qurain 78;
  - Qurain headroom KWD 3.1 M.
- Cross-plan check: all 36 person ids in the seed (owners, bid managers, invitees, confirmers) resolve to plan 003's people in the same tenant.
- The hero conflict pages match plan 005's PDF (12/35 and 23/47). The legacy `EXTRACTED` map is untouched.
- Deviations 1–8 accepted.
- **Open, for the user:**
  - ~~The three real PDFs are not yet in `public/bids/me/`.~~ Copied by the orchestrator on 2026-09-25.
  - The three real-document records carry the issuers' contact names and one official's e-mail address, copied from the public documents. The repo is public, so the user decides whether to keep them (they match the PDFs) or replace them with role titles.
- Carried forward:
  - to plan 008: gcc-demo-data §4.8's roll-up (54/20/24/2) contradicted its own package table. **Decided by the orchestrator (2026-09-25):** the bar is derived from the seed's lines and packages, which gives 49.7 / 32.3 / 16.0 / 2.0; §4.8 is corrected;
  - to plan 007: Najd has 9 sources in the seed but 7 in `data/tenants.ts`. Settings (plan 003) lists `tenant.sources`, so switch it to the seed's `sources` when source health lands, or the two screens will disagree. Add `HERO_EFFORT_HOURS_PER_WEEK` to the water team on Pursue;
  - to the orchestrator: add the extra booklet page refs to gcc-demo-data §4.9.

**Plan 005 review (orchestrator, 2026-09-25): accepted.**
- Re-ran `node scripts/hero-itt/verify.mjs` on the committed PDF without rebuilding: 57/57 pass, 48 pages, no "VAT". Spot-checked flaws 1–4 and 8 in the text, and the cover, p. 12 and p. 43 as images.
- Only the plan's files were touched: `scripts/hero-itt/**`, `public/bids/gcc/**`, and the one `package.json` script line. The issuer is fictional; the only real bodies named are public regulators.
- Deviations 1–9 accepted.
- Carried forward:
  - to plan 004: take the bill titles, line counts and representative items from `scripts/hero-itt/README.md`; Annex (4) uses criteria 1–9, and the README maps them to PQ IDs;
  - to plan 007: open pages with `#page=N`. Vol. 2 exists only as a CSV extract, so decide whether the demo needs a downloadable XLSX.

**Plan 002 review (orchestrator, 2026-09-25): accepted.**
- Spot-checked in the browser: Najd opens on the tenant page, all 16 format checks pass, no console errors.
- **KWD decimals decided:** one decimal for millions in every currency (`KWD 39.3 M`, `OMR 49.2 M`); `dp` overrides. The orchestrator removed `WIDE_UNIT` from `domain/money.ts`, updated the dev check, ui-direction §7.1 and plan 002 step 2.2.1.
- Deviations 1–12 accepted, including the five files outside the list.
- Carried forward: Indian content on Settings and in the persona menu for GCC tenants → plan 003 (steps 5.1, 5.3.1); search and upload for GCC tenants → plans 006 and 007; Settings source health → plan 007.

Plan 001 was verified with a click audit:
- 1,682 controls clicked across all 8 personas, with no runtime errors.
- The only controls with no effect were already-active ones: the current page, or the selected filter or scenario.
- Re-selecting the current sidebar item now scrolls to the top.

## The Stage 1–3 GCC roadmap

**What we're building.** The Stage 1–3 demo for GCC EPC contractors, with DG1 and DG2 and five tenants. The design sources, all in `docs/07-product-design/agr-product-definition/`, are:
- [s1-s3-demo-spec.md](../../docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md): behaviour;
- [kpi-and-screen-catalogue.md](../../docs/07-product-design/agr-product-definition/kpi-and-screen-catalogue.md): what each role sees;
- [gcc-demo-data.md](../../docs/07-product-design/agr-product-definition/gcc-demo-data.md): tenants, hero tender, seed story;
- [ui-direction.md](../../docs/07-product-design/agr-product-definition/ui-direction.md): look and components;
- [roles-and-access.md](../../docs/07-product-design/agr-product-definition/roles-and-access.md): permissions.

**Architecture decisions** (binding on every plan below):
1. **Two worlds, one shell.**
   - The Indian tenant (`gen-in`) keeps today's full-lifecycle screens and data unchanged, as the "full lifecycle preview".
   - GCC tenants use the new Stage 1–3 screens only.
   - A tenant's `world` (`'legacy-in' | 'gcc'`) decides which nav and routes render.
   - GCC screens never import the Indian data modules (`data/tenders.ts`, `data/workspace.ts`, `data/boq.ts` …), and legacy screens never render for a GCC tenant.
2. **New code lives in new folders**, so parallel lanes don't collide:
   - `src/data/gcc/**` for GCC facts;
   - `src/domain/gcc/**` for derivations, one module per stage;
   - `src/pages/gcc/**` for pages, one folder per lane;
   - `src/components/tender/**` for the shared UI kit (plan 006).
3. **Demo state is tenant-scoped** (plan 002). `done`, uploads and the current person are kept per tenant. Reset clears one tenant or all.
4. **One permission function, `can(role, capability, ctx)`** (plan 003). No role checks in pages.
5. **One KPI registry: `domain/gcc/kpi/*.kpi.ts`, collected by glob** (plan 006, catalogue §0.3, dashboards.md §3). Flows, action sources, graph metrics, table columns and dashboard definitions use the same pattern (`*.flow.ts`, `*.actions.ts`, `*.metric.ts`, `columns/*.cols.tsx`, `*.dash.ts`), so parallel plans add files instead of editing shared ones. Every dashboard is a composition of IDs. Each KPI ID is defined once, and duplicates throw in dev.
6. **Money and time go through `domain/money.ts` and `domain/calendar.ts`** (plan 002). There are no `₹` literals or `cr()` calls in GCC code.
7. **Demo today stays Sun 8 Mar 2026**, at 10:00 in the tenant's time zone.
8. **Libraries** (approved 2026-09-25): `ag-grid-community` and `ag-grid-react` for every GCC table of more than five rows, **Community modules only, never Enterprise**; `recharts` for charts. They are lazy-loaded with the GCC dashboards, so the Indian preview doesn't load them.
9. **One dashboard layout for every role** (dashboards.md §1). Pages supply view models; components never compute KPIs. Data reaches dashboards only through the `DataPort` (006 defines it, 017 implements it).

**Waves and file ownership:**
- **Wave 1 (foundations):** 002 first. Then **003, 004 and 005 in parallel**:
  - 003 owns the role, access, people, store-persona, Header, Settings and Sidebar files;
  - 004 owns `src/data/gcc/**` and new files in `src/data/extracted/`;
  - 005 owns `app/scripts/hero-itt/**` and `app/public/bids/gcc/**`.
- **Running wave 1 in parallel (003, 004, 005):**
  - **Work in the main checkout, not a git worktree.** Plan 002, the plans and the product docs are not committed yet, so a worktree made from `main` would not contain them. Plans 004 and 005 also read gitignored local files (`docs/08-sample-tenders/middle-east/extraction-drafts/`, `research/ksa-booklet-outline.md`, the Middle East PDFs), which a worktree cannot see.
  - Other executors are editing other files in the same checkout at the same time. **If typecheck or build fails in a file outside your plan, do not touch it.** Wait a minute and re-run; if it still fails, note it under Blockers and carry on with your own checks. A build that fails on files in `app/dist/` is two builds overlapping: re-run.
  - Do not run `npm install` or change dependencies. Only 005 edits `app/package.json` (one script line).
  - If port 5173 is taken, the dev server moves to 5174 or 5175; that is fine, it serves the same code.
  - In this file, edit only your own row of the index.
  - Browser checks: use your own browser tab, and reset the demo in that tab only. `localStorage` is per browser profile, so tabs in the same pane share demo state.
- **Wave 2 (in parallel, same checkout):**
  - **006** owns the shell files (`App.tsx`, `Sidebar.tsx`, `layout.css`), `data/access.ts`, `data/people.ts`, `data/gcc/stages.ts`, `data/gcc/targets.ts`, `components/dashboard/**`, `components/tender/**` (its eight components), `domain/gcc/{viewmodels,port,period}.ts`, the registry `types.ts` and `index.ts` files, `pages/gcc/{DashboardRoute,StageRoute,ComingNext,TenderSummary,screens}.*`, `pages/gcc/dev/**`, `domain/gcc/gateChips.ts`, and `package.json` (dependencies).
  - **017** owns `data/gcc/lifecycle/**`, `domain/gcc/lifecycle.ts`, `domain/gcc/lifecycle.port.ts`, `dev-checks/40-lifecycle.tsx`, and edits to `data/gcc/types.ts`, `data/gcc/tenants/*.ts` and `data/gcc/index.ts`.
  - 017's last phase waits for 006 Phase 1 (`viewmodels.ts`).
- **Wave 2b (in parallel with 006 and 017, same checkout):**
  - **007a** owns `data/gcc/s1/**`, `domain/gcc/s1/**`, `domain/gcc/dg1/**` and `dev-checks/70-stage1.tsx`;
  - **008a** owns `data/gcc/s2/**`, `domain/gcc/s2/**` and `dev-checks/80-stage2.tsx`;
  - **009a** owns `data/gcc/s3/**`, `domain/gcc/s3/**`, `domain/gcc/dg2/**` and `dev-checks/90-stage3.tsx`.
  - None of them edits 004's data, `people.ts`, `access.ts`, the store or any file 006 owns.
  - 009a imports `eligibilityFor` and `addendaFor` from 007a (its Phase 7 waits for them). 008a's Phase 8 and 009a's Phase 9 wait for 017.
  - **The wave 1 parallel rules above apply**, except that 006 is the one plan that runs `npm install`.
- **Wave 3 (in parallel, four sessions; orchestrator, 2026-09-26):** 015, 013, 019 and 021. Shared contracts the orchestrator wrote before the wave: `domain/gcc/requestKeys.ts` (019 writes requests, 013 reads them) and `queriesFor(ctx)` plus an optional `done` on every lifecycle query and on `DataPort.rows`/`.tracker` (015, 013 and 019 call through it; 021 makes `done` take effect).
  - **019** owns `components/tender/**` (new files only), `pages/gcc/workspace/**`, `domain/gcc/workspace/**`, `components/layout/GccSearch.tsx`, `dev-checks/55-workspace.tsx`, the kit preview, and one line each in `App.tsx`, `screens.ts` (`screenHead`) and `Header.tsx`. It deletes `TenderSummary.tsx`.
  - **021** owns `domain/gcc/demo/**`, `domain/gcc/lifecycle.ts`, `lifecycle.port.ts`, the `withDemoState` stub, `domain/gcc/{dg1,s1/intake.ts,s2,s3,dg2}`, dev checks 40, 45, 70, 80 and 90, and one call each in `dashboards/build.ts` and `DashboardRoute.tsx`.
- **Wave 3, the dashboard plans:**
  - **015** owns `data/gcc/portfolio.ts`, `*/portfolio.*` in the registries, `metrics/stages.metric.ts`, `gateChips.ts` (body) and `dev-checks/50-portfolio.tsx`.
  - **013** owns the `stage*.kpi.ts`, `requests.*`, `stages.*` and `steps.metric.ts` registry files, `domain/gcc/requests.ts` and `dev-checks/60-stages.tsx`.
- **Wave 4 (in parallel, six sessions; orchestrator, 2026-09-26):** 007b, 008b, 009b, 011, 022 and 023. Shared contracts the orchestrator wrote before the wave: `domain/gcc/documents.ts` (`documentFor`: 007b and 012 read documents; 022 and 023 register theirs in `data/extracted/gcc/index.ts`), `data/gcc/s2/replies.ts` (`SCRIPTED_REPLIES`: 008b's "Simulate supplier replies" submits them; 008b, 022 and 023 append their tenders' replies), `WorkspaceCtx.check(cap, extra?)`, and `AuditEvent.sensitive`.
  - **007b** owns `pages/gcc/s1/**`, the workspace tabs `documents`, `requirements`, `eligibility`, `dates`, `queries`, `dev-checks/75-stage1-screens.tsx`, its five `screens.ts` entries, one line in `Header.tsx` (GCC upload), the override case in `domain/gcc/workspace/rail.ts`, and backward-compatible props on `SourceChip` and `EligibilityLine`.
  - **008b** owns `pages/gcc/s2/**`, `pages/gcc/supplier/**`, the `sourcing` tab, `dev-checks/85-stage2-screens.tsx`, its three `screens.ts` entries, one route in `App.tsx`, the hero's replies in `replies.ts`, `portalQuote`'s VAT and Incoterm fields, the three pursue guards, and a cap marker on `CoverageBar`.
  - **009b** owns `pages/gcc/s3/**`, `pages/gcc/dg2/**`, `components/tender/MembersPanel.tsx`, the `inputs` and `bid-decision` tabs, `dev-checks/95-stage3-screens.tsx`, its two `screens.ts` entries, the pack-input route in `requests.actions.ts`, and one `KitPreview` section.
  - **011** owns `pages/platform/**`, `data/platform/**`, `domain/platform/**`, `pages/gcc/admin/AuditLog.tsx`, `actions/platform.actions.ts`, `dev-checks/65-platform.tsx`, one route block in `App.tsx`, `auditTo` in the store, the `/admin/audit` entry in `screens.ts`, and one action ID in `portfolio.dash.ts`.
  - **022** and **023** own `scripts/demo-itt/{cbhh-011,ilra-042}/**`, their PDFs in `public/bids/gcc/`, their extraction records, their tenant's row and lifecycle story, and **append-only** entries in the shared data files (queries, bonds, effort, S2 tenders, suppliers, replies, S3 packs, inputs, win, competitors) and in `data/extracted/gcc/index.ts`. Each updates only its own tenant's dev-check targets. Najd's readings must not move.
  - **Rule extension (orchestrator, 2026-09-26):** the Stage 1 rules could not express 022's and 023's eligibility lines or a fixed bond amount. **022 alone** extends `domain/gcc/s1/eligibility.ts` and `domain/gcc/s1/bond.ts`, adding optional fields to `PqRequirement`, `SimilarProject`, `KeyPerson` and `BondTerms`. The extensions are data-driven and generic enough for 023. With a field absent, a tender reads exactly as before. `EligibilityLine`, `EligibilityResult`, `LineState` and `LineAction` don't change. **023 reuses** those fields and doesn't edit those files; if it needs more, it asks.
  - Shared one-line edits (`App.tsx`, `screens.ts`, `Header.tsx`, index files): re-read right before editing, add lines, move nothing.
  - **Wave 5 after wave 4:** 012 (Arabic intake, on 007b and 023), 018 (DG3), 010 (Company and Administration), 014 (presenter controls). Then 016 (script QA).
- **Wave 6 (orchestrator, 2026-09-27):** 016a and 016b in parallel, then 016c alone after their review. File ownership:
  - **016a** owns the rules and seed fixes:
    - `domain/gcc/actions/portfolio.actions.ts`, `stages.actions.ts`, `lifecycle.port.ts`, `kpi/**`;
    - the named items in `domain/gcc/s1`, `s2` and `s3`, `workspace/audit.ts`, `demo/50-dg3.apply.ts` and `demo/25-stage3-entry.apply.ts`;
    - `pages/gcc/s1/Screening.tsx`, `pages/gcc/s2/**`, the `keyDatesFor` call sites in `dates.tab.tsx` and `KeyDateList.tsx`;
    - the seed corrections in `data/**`, the dev checks, and dashboards.md's Batinah note.
  - **016b** owns the screens and copy:
    - `components/layout/**` (TenantSwitch, Header, GccSearch, DemoMenu), `styles/components.css`, `styles/layout.css`, the font stacks in `tokens.css`, `screenHead`;
    - one `ModalSpec` case in `store.tsx`, `overlays/Modals.tsx`;
    - the dashboard kit (`base.cols`, `requests.cols`, `dashboard.css`, `TenderGrid`, `StageChart`, `DashboardPage`), and the exported route in `requests.actions.ts`;
    - `WorkspaceHeader`, `workspace/header.ts`, `Rail`, the `documents` and `bid-decision` tabs, `UploadGcc`, `Credentials.tsx`, `dg3/DecisionPanel`, `dg2/PositionForm`.
  - **016c** runs alone and may fix small things in any file. It writes `docs/07-product-design/agr-product-definition/demo-runbook.md` and updates spec §1, §17 and §19.
  - **Decisions:** Weighted stays on Stage 3 issued packs (dashboards.md §6). The seeded input times of T-2026-061 and T-2026-042, and Arabic highlighting in the PDF viewer, are known limits for the runbook. `see.quotes.summary` shows levelled and mix totals with the suppliers' original prices masked (the capability's label, `access.ts`).
- **Wave 5 (in parallel, five sessions; orchestrator, 2026-09-27):** 010, 012, 014, 018 and 024. Plan 010 was split: 010 is Company, 024 is Administration. File ownership, so no two sessions edit one file:
  - **010** owns `pages/gcc/company/**`, `domain/gcc/company/**`, `dev-checks/66-company.tsx`, the `/company` entry in `screens.ts`, the renewal route in `requests.actions.ts`, and "Add evidence" in `EligibilityPanel.tsx`.
  - **012** owns `domain/gcc/arabic/**`, `components/tender/BilingualValue.tsx`, `workspace/parts/ReadInEnglish.tsx`, `dev-checks/73-arabic.tsx`, the font (`package.json`, `main.tsx`, `tokens.css`), `ocrPages` on the record type and ILRA_042, `pipelineFor`'s OCR step, and the Requirements, Documents and Overview tabs, `ValidationCard`, `KeyDateList`, and a backward-compatible `SourceChip` tip.
  - **014** owns `domain/gcc/demo/presets/**`, `demo/compare.ts`, `demo/25-stage3-entry.apply.ts`, `components/layout/DemoMenu.tsx`, `pages/gcc/demo/**`, `dev-checks/46-presenter.tsx`, `applyPreset` in the store, one line in `Header.tsx`, one route in `App.tsx`, the move of `pendingReplies` to `domain/gcc/s2/simulate.ts`, and one link in `WorkspaceHeader.tsx`.
  - **018** owns `data/gcc/dg3/**`, `domain/gcc/dg3/**`, `demo/50-dg3.apply.ts`, `pages/gcc/dg3/**`, `dev-checks/97-dg3.tsx`, the `/dg3` entry in `screens.ts`, and the `dg3Approve` text in `portfolio.actions.ts` (and CMP-5's sub-line if needed).
  - **024** owns `pages/gcc/admin/**` except `AuditLog.tsx`, `domain/gcc/admin/**`, `dev-checks/67-admin.tsx`, the `/admin*` entries in `screens.ts`, the branding lines in `AppShell.tsx` and `TenantSwitch.tsx`, and the GCC branch of `pages/Settings.tsx`.
  - **Shared by entry:** `screens.ts` (010, 018 and 024, one entry each: re-read before editing). Nobody else edits `tokens.css` (012), `Header.tsx` or `store.tsx` (014), `AppShell.tsx` (024).
  - **Decisions (orchestrator, 2026-09-27):** "Treat as newly published" is deferred (key dates are read without `done` in about 14 modules, and no script uses it). The fit model page is a what-if, not a saved change. The hero gets no Stage 3 seed: script C stays on T-2026-097, and "Advance to Stage 3" serves T-2026-061 and T-2026-042.
- **Wave 4 (original outline, kept for history):** 019 (tender kit part 2) first. Then the **stage screen lanes in parallel:**
  - 007b owns `pages/gcc/s1` (and may fix bugs in 007a's folders);
  - 008b owns `pages/gcc/s2` and `pages/gcc/supplier`;
  - 009b owns `pages/gcc/s3`, `pages/gcc/dg2` and the contributor input forms;
  - 010 owns `pages/gcc/company`; 024 owns `pages/gcc/admin` (010 was split, 2026-09-27);
  - 011 owns `pages/platform`;
  - 012 (after 007b) owns `domain/gcc/arabic` and the Arabic records.

  - 018 (after 009b) owns `pages/gcc/dg3` and `domain/gcc/dg3`.

  Each lane registers any new KPIs as new registry files, flips its screens to `built` in `pages/gcc/screens.ts`, and replaces the interim step facts it supersedes with derivations (with a dev check that they agree).
- **Wave 5:** 014 (presenter controls).
- **Wave 6:** 016, the end-to-end script QA against spec §19.

**Wave 2+ plans are written after wave 1 lands**, so they reference real code. Their outlines:
- **006, 013, 015, 017:** written (see the index).
- **019 Tender kit part 2 and Tender Workspace:** the rest of ui-direction §6.2 (RecommendationCard, OverrideModal, SourceChip, CoverageBar, ThresholdBar, EligibilityLine, ReasonCodePicker, Sheet, Callout, RequestButton, AuditEntry, LangBadge; `MembersPanel` moves to 009b and `BilingualValue` to 012); the Tender Workspace `/tenders/:id` with header, tabs frame and right rail, replacing 006's `TenderSummary`.
- **007b Stage 1 and DG1 screens** on 007a's rules (spec §6–7):
  - radar, with sources, captures and reconciliation;
  - intake pipeline steps, including the booklet purchase;
  - validation queue (conflict pattern; send-back keeps the item open);
  - Requirements tab; eligibility against the vault; fit with the PQ-fail cap; key dates with the calendar; addenda diff; triage; queries;
  - DG1 evidence pack and form, with the lock while blocking fields are open;
  - hero upload recognition in every tenant;
  - Wadi Zarqa and Lebanon records.
- **008b Stage 2 screens** on 008a's rules (spec §8): packaging with the coverage bar and the 30% cap check; shortlist with screening gate; RFQs with matched lines only; tracking and reminders; levelling trace; best-fit; clarifications; internal input requests; Supplier Portal preview.
- **009b Stage 3 and DG2 screens** on 009a's rules (spec §9–10, **changed by dashboards.md §9**): pack sections 9.1–9.10 with freshness and re-run; issue with the clock; members panel with five named positions (CEO, CFO, TD, OD, Sector Head) and quorum 3 of 5; **the Head of Tendering's approval** with the majority check; conditions; No-Bid letter draft; re-open (approved by the Head of Tendering); the contributor input forms (catalogue §C.6), which My requests (013) opens.
- **018 DG3 approval:** the gate screen of dashboards.md §9 (evidence summary, approve or reject with reasons, send back to Compliance, record preview, audit, re-open with a reason).
- **010 Company and Administration:** credentials vault UI, capability profile, users and roles (with View as entry), committees and gates (owner-required blocking), sources, fit model with live impact, targets and SLAs, branding, audit log.
- **011 Platform Console:** separate shell; tenants and health tiles; break-glass request, which appears in the tenant's audit log.
- **012 Arabic:** Plex Sans Arabic via `@fontsource/ibm-plex-sans-arabic` (approved); `BilingualValue`; Arabic records (Kuwait ccTLD; the scanned roads tender after its extraction is re-run); "Arabic prevails" flag; "Read in English" summary.
- **014 Presenter controls:** scenario presets; Reset (tenant or all); Advance agent work; Treat as newly published; Compare tenants lens (labelled demo view); prospect branding.
- **016 QA:** scripts A–F at 1440 and 1280, light and dark, keyboard pass, Reset and presets, no leaks between tenants.

## Status values
- `READY`
- `IN PROGRESS (executor, date)`
- `BLOCKED (reason)`
- `DONE — awaiting review (date)`
- `DONE (date)`, set by the orchestrator after review.

## Plan template

Copy this for every new plan (`NNN-short-name.md`). Keep every leaf step small enough to verify on its own.

```markdown
# NNN — Title

Status: READY · Depends on: (plan numbers, or none) · Can run in parallel with: (plan numbers)

## Goal
What the demo can do after this plan that it cannot do now, in one or two sentences, in the prospect's terms.

## Context
- Why: the pain or demo scenario this serves (link to product-foundation §, roles-and-access §).
- Current behaviour, with file:line references.

## Scope
- Files to create or change: (explicit list)
- Out of scope: (explicit list; the executor stops and asks before touching these)

## Steps
### Phase 1 — …
- [ ] 1.1 …
  - [ ] 1.1.1 …  (acceptance: …)
  - [ ] 1.1.2 …
- [ ] 1.2 …
### Phase 2 — …
- [ ] 2.1 …

## Data and derivation
New facts go in `src/data/…`; derived values in `src/domain/live.ts` (names of the new fields).
New `done` keys, and confirmation that Reset demo clears them.

## Acceptance checks
- [ ] typecheck and build pass
- [ ] Click-through as persona(s) …: expected result …
- [ ] Reset demo returns to seed state
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
```
