# 042 — OG and Previous labels

Status: DONE — awaiting review (2026-10-06) · Depends on: none · Can run in parallel with: 039, 040, 041, 043, 044

## Goal
A prospect can tell at a glance which tenders are genuine documents the client supplied (**OG**) and which tenders are re-issues of a tender seen before (**Previous**). Both labels show wherever a tender is named in a list or opened.

## Context
- User's change list of 2026-10-06, items 16 and 10 (the "clearly distinguish old tenders" half; plan 039 does the funnel numbers). Read `app/plans/README.md` → "Wave 12".
- **OG**, user decision: the tenders built on the real client-supplied PDFs in `public/bids/me/`. Today that is four register rows: Najd `T-2026-120` (Wadi Zarqa WWTP PQ, `docKey: 'wadi-zarqa'`), Qurain `T-2026-071` (Kuwait .kw ccTLD, `'kw-cctld'`) and `T-2026-072` (Wadi Zarqa, `'wadi-zarqa'`), and Batinah `T-2026-041` (CDR Jezzine Lot 3, `'cdr-jezzine-lot3'`). The file map is `src/data/extracted/gcc/index.ts` (`GCC_DOC_FILES`). The hero tenders (118, 061, 042) are synthetic: **not** OG.
- **Previous**, user decision: an "old tender" is a **re-issued tender**: the client re-published a tender we saw before (a re-tender, an extension or a new lot). It is marked "Previous" and linked to the earlier record.
- Where tenders are named: the dashboard table's TID/Tender columns (`src/components/dashboard/columns/base.cols.tsx:123`), the tender workspace header (`src/pages/gcc/workspace/WorkspaceHeader.tsx`) and the Tender library (`src/pages/gcc/library/`).

## Scope
- Files to create: `src/data/gcc/reissued.ts`, `src/domain/gcc/labels.ts`, `src/components/tender/TenderLabel.tsx` (styles in `components/tender/tender.css` or a new `tender-label.css`).
- Files to change: `src/components/dashboard/columns/base.cols.tsx`, `src/pages/gcc/workspace/WorkspaceHeader.tsx`, `src/pages/gcc/library/**`.
- Out of scope (stop and ask): the tenant seed files (`src/data/gcc/tenants/*.ts`; plan 043 is editing names there, so read only); the funnel (039); KPI tiles (040); ⌘K search and other lists (note them as follow-ups).

## Steps
### Phase 1 — The facts and the rule
- [x] 1.1 `labels.ts`: `isOg(tenant, tenderId)` is derived: true when the tender's `docKey` maps to a file under `/bids/me/` in `GCC_DOC_FILES`. No list of ids is typed, so a fifth real document would be picked up automatically.
- [x] 1.2 (Najd, Corniche and Dafna at Stage 1; Batinah and Qurain past Stage 1 after review, see Review follow-up) `reissued.ts`: the re-issued tenders, `{ tenderId, previousId, previousRef, reason: 're-tender' | 'extension' | 'new-lot', note }`. Pick **2 Najd tenders and 1 in each other tenant** among the live Stage 1 register rows (not the heroes 118, 061 or 042, and not OG ones). Point each at an earlier **closed** tender in the same tenant's lifecycles: cancelled by the employer, or a lost bid whose re-tender is plausible. Read the lifecycles to choose; list the pairs and why in the report. `previousRef` is the earlier tender's authority reference, read from its data, not typed.
- [x] 1.3 `labels.ts`: `previousOf(tenant, tenderId)` returns the link (the earlier tender's id, title, how it ended and when, all derived) or null.

### Phase 2 — The labels
- [x] 2.1 `TenderLabel`: two small pills that fit beside a TID.
  - **OG**: neutral ink on a light surface, with a tooltip "Original: built on a real tender document supplied by the client".
  - **Previous**: a calm blue tint, the same family 039 uses for "previous" in the funnel, with a tooltip "Re-issued: <reason>; earlier tender <TID>, <ended how> <date>".
  - Status as a word in a pill; no coloured stripes; works in light and dark.
- [x] 2.2 Dashboard table: the pills sit after the TID in the TID cell, and keep the column width. With both, show both.
- [x] 2.3 Workspace header: the pills beside the TID. For Previous, add a line under the title: "Re-issue of <TID> (<ended how>, <date>) · Open earlier tender", which opens the earlier tender's workspace if the viewer may see it, else shows the TID without a link.
- [x] 2.4 Tender library: the pills on each tender row or card.

### Phase 3 — Checks
- [x] 3.1 Add rows to a dev check (a new `82-labels.tsx`, registered the way the others are): OG is true for exactly the four tenders above and false for the heroes; every `reissued.ts` row points at an existing closed tender in the same tenant; `previousRef` matches it. About 6 rows.

## Data and derivation
- New facts: `src/data/gcc/reissued.ts` only. OG is derived.
- No new `done` keys.

## Demo-grade rules
- Build what the prospect sees; dev checks stay short.
- Non-negotiables: a tender carries the same labels on every screen; masking holds (a restricted tender's earlier record never leaks); Reset works.

## Acceptance checks
- [x] typecheck and build pass (see Verification: the repo's typecheck currently stops on plan 043's `wadi-zarqa.ts` line 540; checked on a copy with that one apostrophe escaped).
- [x] Najd Head of Tendering (`najd.hot`), port 5194: T-2026-120 shows OG in the dashboard table, its workspace header and the library; the two re-issued Najd tenders show Previous and link to their earlier tenders.
- [x] Qurain HoT: T-2026-071 and T-2026-072 show OG. Batinah HoT: T-2026-041 shows OG.
- [x] The Bid Manager sees the labels on the tenders they may see; no leaks.
- [x] No console errors at 1440 and 1280; Reset demo returns to the seed state.

## Execution report
- Changed files:
  - new `src/data/gcc/reissued.ts`: the re-issue pairs, reason and note; `previousRef` read from the earlier lifecycle's `source.ref`.
  - new `src/domain/gcc/labels.ts`: `isOg` (docKey → a `GCC_DOC_FILES` path under `/bids/me/`), `reissueOf`, `previousOf` (earlier TID, title, reference, how it ended and when, from the lifecycle and the debrief vocabulary's `endingAt`/`ENDINGS`; masked to the TID alone for a viewer who may not open the earlier tender), `labelsOf`.
  - new `src/components/tender/TenderLabel.tsx` and `tender-label.css`: `useTenderLabels`, `TenderLabelPills` (OG neutral, Previous in `--blue`/`--blue-soft`, popover via `Tip`; a `plain` variant with a native title for pills inside another button), `TenderLabel`; the workspace's "Re-issue of" line style (`.tlab-prevline`).
  - `src/components/dashboard/columns/base.cols.tsx`: the TID column renders `TidCell`: the TID, with the pills on a second line, so the column keeps its 112 px. The pills carry `data-cell-action`, so clicking one opens its popover without selecting the row.
  - `src/pages/gcc/workspace/WorkspaceHeader.tsx`: pills beside the TID; for a re-issue, a line under the title "Re-issue of T-… (ended how, date) · Open earlier tender" (link only when the viewer may open it; the note is the line's title).
  - `src/pages/gcc/library/Library.tsx` and `library.css`: pills (plain) after the TID in each list row, and interactive pills in the selected tender's card head.
  - new `src/pages/gcc/dev-checks/82-labels.tsx` (6 rows; picked up by the glob in `GccPending.tsx`).
- Re-issued pairs (all earlier records are `history` lifecycles built from the tenant seeds, so their ids don't move when 039 regenerates; re-read at the end against 039's current lifecycles, unchanged):
  - Najd T-2026-122 "Dammam lift stations rehabilitation" (ECWS) ← T-2026-058 "Hofuf sewage lift stations" (ECWS, ECWS/PRJ/2026/0158), the client postponed it indefinitely, 25 Feb 2026 (reads "cancelled by the employer"). Re-tender: same employer, same lift station works, re-issued under a new reference.
  - Najd T-2026-124 "Supply of ductile iron pipes and fittings, Qassim" (CCWS) ← T-2026-066 "Unaizah water network extension" (CCWS, CCWS/PRJ/2026/0227), the employer moved the budget and cancelled it, 24 Feb 2026. New lot: Unaizah is in Qassim; the pipe supply re-issued as a supply-only lot.
  - Corniche T-2026-063 "Dubai hotel fit-out, 240 keys" (Gulfshore Hospitality Developments) ← T-2025-157 "Al Barsha hotel fit-out" (same employer, GHD/PRJ/2025/0305), lost on price, 12 Jan 2026. Re-tender: the award was not concluded.
  - Dafna T-2026-034 "Doha pump station upgrade" (Doha Drainage Works Authority) ← T-2025-223 "Industrial area stormwater outfall" (same employer, DDWA/PRJ/2025/0287), lost on price, Dec 2025. New lot: the pump station of the same drainage scheme tendered on its own.
  - No Stage 1 register row in Najd matched an employer-cancelled or price-lost tender by title; these four are the closest same-employer, same-works pairs. The notes avoid names, so 043's renames don't break them.
- Verification:
  - `tsc -b`: my files are clean. While I worked, the repo's typecheck stopped on plan 043's `src/data/extracted/gcc/wadi-zarqa.ts` line 540 (an unescaped apostrophe in "plant's"), which also breaks the dev server (500 on load) and did for over 30 minutes. I could not edit that file, so I verified on a scratch copy of `app/` (my changes plus every other lane's at that moment) with that one apostrophe escaped: `tsc -b` passes and `vite build` passes (only the usual chunk-size warning).
  - Dev check 82: all 6 pass in all five companies (Najd, Corniche, Dafna, Batinah, Qurain). Najd masking row: 17 people × 2 re-issues, 28 may open the earlier tender, no leaks. Re-run at the end on a fresh copy of the repo: still all 6 pass.
  - Clicked through on port 5194 (scratch copy), no console errors:
    - Najd HoT dashboard at 1440 and 1280: T-2026-120 shows OG, T-2026-122 and T-2026-124 show Previous under the TID, TID column unchanged in width; clicking Previous opens "Re-issued: new lot; earlier tender T-2026-066, cancelled by the employer Tue 24 Feb".
    - Najd workspace T-2026-122: Previous pill and "Re-issue of T-2026-058 (cancelled by the employer, Wed 25 Feb) · Open earlier tender"; the link opens T-2026-058's workspace. T-2026-120 workspace at 1280: OG beside the TID.
    - Najd Tender library: Previous in the list rows for 122 and 124, OG in the card head for 120, Previous in the card head for 122.
    - Najd Bid Manager (`najd.bid`) dashboard: the same labels on the 28 tenders they see (restricted 121 hidden).
    - Qurain HoT dashboard: T-2026-071 and T-2026-072 show OG. Batinah HoT dashboard at 1280: T-2026-041 shows OG; 042 and 118 show nothing.
    - Dark mode: Corniche workspace T-2026-063 ("Re-issue of T-2025-157 (lost on price, Mon 12 Jan)") and Dafna dashboard (T-2026-034 Previous).
  - Reset: the labels are derived and write nothing (no new `done` keys), so Reset demo has nothing to clear.
- Deviations from plan:
  - The TID cell stacks the pills under the TID (two lines, as the Tender cell does) instead of after it on one line: at 112 px "T-2026-120" plus a pill doesn't fit on one line, and the plan says to keep the width.
  - In the library list the pills are plain (native title, screen-reader text) because they sit inside the row's button; the card head's pills have the popover.
  - "Ended how" uses the debrief vocabulary (plan 035): an employer's stop reads "cancelled by the employer", so T-2026-058 reads that while its own header's health pill says "Withdrawn" (see Follow-ups).
- Blockers / questions:
  - **Batinah and Qurain have no eligible row.** Their only live Stage 1 register rows are the hero 118, their hero (Batinah 042) and the OG tenders (Batinah 041, Qurain 071 and 072), all excluded by step 1.2. I left both without a re-issue (`reissued.ts` has empty lists; dev check 82 expects 0 there). Options for the orchestrator, if wanted: (a) a live Stage 2 register row instead, e.g. Batinah T-2026-027 "Muscat interchange upgrade" (CARD) or Qurain T-2026-062 "Northern Kuwait water transmission mains" (NWGPO) / T-2026-058 "Kuwait South wastewater conveyance tunnels" (SGSA), each paired with a closed same-employer tender; (b) allow an OG tender (Batinah 041's reference "RFB No. PW015 RE" is itself a re-issue); (c) leave as is. Each is a one-row change in `reissued.ts` plus the expected count in dev check 82.
- Review follow-up: Batinah and Qurain pairs added (orchestrator decision 2026-10-06, option (a)), each a live, non-hero, non-OG register row past Stage 1, paired with an authored history tender from the same employer and the same kind of works:
  - Batinah T-2026-027 "Muscat interchange upgrade" (Capital Area Roads Directorate, Stage 2) ← T-2025-184 "Seeb service roads" (same employer, CARD/PRJ/2025/0218), lost on price, Wed 5 Nov 2025. New lot: the interchange issued as its own lot of the same capital area road scheme.
  - Qurain T-2026-062 "Northern Kuwait water transmission mains" (National Water Grid Projects Office, Jahra, Stage 2) ← T-2025-259 "Jahra water transmission" (same employer, NWGPO/PRJ/2025/0557), lost on price, Thu 1 Jan 2026. Re-tender: the earlier award was not concluded. Chosen over T-2026-058, whose employer (SGSA) has no closed conveyance or tunnel tender in the seed history.
  - `reissued.ts` header comment updated. In dev check 82, `COUNT_EXPECTED` is now batinah 1 and qurain 1, and row 5 allows a row past Stage 1 in those two companies only.
  - Verified on the repo itself, which typechecks again: `tsc -b` passes; dev check 82 passes all 6 rows in all five companies; on port 5194 both tenders show Previous in the Head of Tendering's dashboard table and in the workspace header ("Re-issue of T-2025-184 (lost on price, Wed 5 Nov 2025) · Open earlier tender"; "Re-issue of T-2025-259 (lost on price, Thu 1 Jan) · Open earlier tender"), with no console errors. Server stopped.
- Follow-ups noticed (not done):
  - The earlier tender's workspace doesn't link forward ("Re-issued as T-2026-122").
  - Health pill "Withdrawn" against the debrief vocabulary's "Cancelled by the employer" for employer stops (existing, predates this plan).
  - The funnel's "previous" counts (039, e.g. Najd 18) are intake-level notices; only 4 register rows carry the Previous label, and Batinah's funnel reads 15 previous with no labelled tender.
  - ⌘K search results, the Stage 1 screens' own lists, the calendar and the Needs-your-action cards name tenders without the labels.
