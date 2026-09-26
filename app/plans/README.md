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
| 007b | Stage 1 and DG1 screens (on 007a) | 4 | 006, 019, 007a | Outline |
| 008b | Stage 2 screens and Supplier Portal (on 008a) | 4 | 006, 019, 008a | Outline |
| 009b | Stage 3 pack, DG2 gate and contributor forms (on 009a) | 4 | 006, 019, 009a | Outline |
| 010 | Company and Administration | 4 | 006 | Outline |
| 011 | [Platform Console and break-glass](011-platform-console.md): separate operator shell with counts and health only, the break-glass request that the tenant's Head of Tendering sees, and the tenant audit log | 4 | 006, 015 | READY (parallel with 007b, 008b, 009b, 022, 023) |
| 012 | Arabic intake: bilingual values, "Read in English", Plex Sans Arabic, on 007b's screens and 023's Arabic tender | 5 | 007b, 023 | Outline (written when 007b and 023 land) |
| 013 | [Stage dashboards and My requests](013-stage-dashboards.md): one dashboard per stage (1–9), shared by its owner and the Head of Tendering; Finance/HR requests | 3 | 006, 017, 020 | DONE (2026-09-26) |
| 014 | Presenter controls and Compare tenants lens | 5 | 007b–009b | Outline |
| 015 | [Portfolio dashboards](015-portfolio-dashboards.md): Head of Tendering, CEO and Bid Manager homes; PF KPIs, decision funnel, approvals, stage graph with drill-down | 3 | 006, 017, 020 | DONE (2026-09-26) |
| 016 | Script QA and polish (spec §19 acceptance) | 6 | all | Outline |
| 018 | DG3 approval (lite gate screen for the Head of Tendering, dashboards.md §9) | 4 | 009b (gate screen pattern), 017 | Outline |
| 019 | [Tender Workspace and kit part 2](019-tender-workspace.md): `/tenders/:id` with header, tab registry, rail, Overview and Decisions & audit; RecommendationCard, OverrideModal, SourceChip (PDF at the page), Callout, Sheet, RequestButton, AuditEntry …; ⌘K tender search | 3 | 006, 017, 007a, 009a, 020 | DONE (2026-09-26) |
| 020 | [Review fixes](020-review-fixes.md): the 2026-09-26 review of 006, 017, 007a, 008a and 009a; five parallel lanes (A shell and access, B lifecycles and seed, C Stage 1, D Stage 2, E Stage 3) | 2c | 006, 017, 007a, 008a, 009a | DONE (2026-09-26) |
| 021 | [Demo state and rule fixes](021-demo-state-and-rule-fixes.md): demo actions (DG1, Stage 2 progress, pack, positions, DG2) merged into the lifecycles so every dashboard shows them; DG1 rounds, DG2 conditions masked and the other rule bugs from the 020 review | 3 | 017, 007a, 008a, 009a, 020 | DONE (2026-09-26) |
| 022 | [Second demo tender, UAE](022-demo-tender-uae.md): Corniche's Abu Dhabi hospital MEP (T-2026-061), English; its own PDF, catches, eligibility, packages, quotes and pack | 4 | 019, 021 | READY (parallel with 007b, 008b, 009b, 011, 023) |
| 023 | [Third demo tender, Oman, Arabic](023-demo-tender-oman-arabic.md): Batinah's Sohar–Buraimi road dualling (T-2026-042), an Arabic PDF with scanned pages; bilingual extraction, catches, eligibility, packages, quotes and pack | 4 | 019, 021 | READY (parallel with 007b, 008b, 009b, 011, 022) |

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
- **Wave 4:** 019 (tender kit part 2) first. Then the **stage screen lanes in parallel:**
  - 007b owns `pages/gcc/s1` (and may fix bugs in 007a's folders);
  - 008b owns `pages/gcc/s2` and `pages/gcc/supplier`;
  - 009b owns `pages/gcc/s3`, `pages/gcc/dg2` and the contributor input forms;
  - 010 owns `pages/gcc/company`, `pages/gcc/admin`;
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
