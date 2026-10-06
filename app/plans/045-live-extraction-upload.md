# 045 — Upload: a live-looking extraction that opens the tender

Status: DONE — awaiting review (2026-10-06) · Depends on: 039–044 (accepted) · Can run in parallel with: none planned

## Goal
In the demo, the presenter clicks **Upload tender** and drops a real document, e.g. `wadi-zarqa-pq.pdf` for T-2026-120 · Wadi Zarqa WWTP Phase 1 DBO (PQ). For about 20 seconds the platform visibly reads the document and pulls everything out of it: pages, authority, reference, key dates, scope, prequalification criteria, flags, eligibility and fit. It then matches the tender to the register and opens that tender's existing Overview page. The prospect sees extraction happening in front of them.

## Context
- User's request, 2026-10-06: "during the demo i want you to show you are extracting the data, show some processing so it looks realtime, getting everything out of it and then it should take me to the already existing page of that tender."
- **User decisions (2026-10-06):**
  - about **20 seconds** from drop to page;
  - **no "Demo" label and no "nothing is read live" sentence** on this screen. The site-wide "Prototype: indicative UI, illustrative data" footer stays as it is;
  - it lands on the tender's **Overview**;
  - it works for **every document the demo holds** (the hero booklet, the hospital ITT, the Arabic roads booklet, Wadi Zarqa, Kuwait ccTLD, Jezzine …), each opening its own tender. Files the demo doesn't hold keep today's behaviour ("Stopped after the page read", the Coordinator's queue).
- **Current behaviour:** `src/pages/gcc/s1/UploadGcc.tsx`.
  - `take(file)` records the upload through `uploadWrite` (`pages/gcc/s1/vm/uploads.ts`), writes an audit entry and a toast, and shows the result **instantly**: a "Recognised · Already on the register … Linked, not duplicated" callout, today's `IntakeSteps` if the tender has an intake event, and an **Open T-…** button that goes to `/tenders/:id?tab=documents`.
  - The modal also lists "Files this demo holds" as buttons, and ends with "Demo: files are recognised by their name. Nothing is read live, and nothing leaves the app."
  - A second upload of the same file reads "Duplicate".
- **The extracted data already exists:** `documentFor(tenant, tenderId)` in `src/domain/gcc/documents.ts` returns `record`, which is one of three types:
  - `ExtractedTenderGcc`: the hero and plan 022's tender, with `groups` and `conflicts`;
  - `ExtractedTender`: the real sample documents, e.g. Wadi Zarqa in `src/data/extracted/gcc/wadi-zarqa.ts`;
  - `ExtractedTenderAr`: plan 023's Arabic booklet, with Arabic `source` on each item.

  Each record carries the document type, page count, `scanned`, the reference, summary fields, dates, eligibility/PQ criteria, scope lines and flags, each with a page number. Eligibility and fit for a tender come from `eligibilityFor` (`domain/gcc/s1/eligibility.ts`) and the register row's `fit`.

## Scope
- Files to create:
  - `src/pages/gcc/s1/ExtractionRun.tsx`: the processing view;
  - `src/domain/gcc/s1/extractionRun.ts`: the step script, built from the record (a pure function, no React);
  - styles in `src/pages/gcc/s1/s1.css`, or a new `extraction-run.css`.
- Files to change: `src/pages/gcc/s1/UploadGcc.tsx`.
- Out of scope (stop and ask): any change to the extracted data or the register; the Coordinator's intake queue screens; the Indian preview's upload (`components/intake/*`); new libraries; anything that would actually read the PDF.

## Steps
### Phase 1 — The step script (domain)
- [x] 1.1 `extractionRun(tenant, tenderId, record)` returns an ordered list of steps. Each step has a label, a duration in ms, and the items it reveals. The durations add up to about **20 s**, from the drop to "Opening …". Suggested steps (adapt to what each record type holds; never invent a field the record lacks):
  1. **Receiving the file**: name, size class, page count ("70 pages"), language. If `scanned`: "OCR on scanned pages".
  2. **Reading pages**: a page counter ticking up to the page count, with a progress bar.
  3. **Identifying the document**: the document type (e.g. "Request for Qualifications"), the authority / issuer, the reference number, the country.
  4. **Key dates**: each date as it is found (published, questions, submission, opening), with its page reference ("p. 26").
  5. **Scope**: the first 2–3 scope lines.
  6. **Prequalification and eligibility criteria**: the criteria one by one (e.g. "Turnover ≥ … over 3 years · p. 31"), with a running count ("12 criteria found").
  7. **Flags and risks**: the extraction flags (e.g. "FIDIC Gold Book, 20-year operation", "financing only applied for").
  8. **Checking against your company**: the eligibility roll-up (pass / at risk / fail counts from `eligibilityFor`) and the fit score from the register row.
  9. **Matching the register**: "Matched to T-2026-120 · Wadi Zarqa WWTP Phase 1 DBO (PQ), already on the register: linked, not duplicated." For a repeat upload of the same file: "Already uploaded <when> by <who>: linked, not added again".
  10. **Opening T-2026-120**: a short beat, then navigate.
- [x] 1.2 Every revealed value is read from the record, the register row or the eligibility result, so no number is typed in a page (CLAUDE.md rule 1). The same tender reads the same on this screen as on its Overview.
- [x] 1.3 An Arabic record shows its Arabic values with the existing bilingual pattern (`BilingualValue`, `<bdi dir="auto">`), as the tender page does.

### Phase 2 — The processing view
- [x] 2.1 The upload modal switches to the processing view as soon as a recognised demo file is taken: the dropped file, a dropzone, or one of the "Files this demo holds" buttons.
  - Header: the file name and "Intake & Extraction agent".
  - A step list on the left (pending / running / done, each status as a word or a small spinner and tick, never a coloured left stripe).
  - On the right, the fields appearing as they are found, grouped by step, each with its page reference. Values fade or type in gently, using the motion tokens. The progress bar shows overall progress.
- [x] 2.2 No "Demo" chip and no "nothing is read live" text on this view (user decision). Keep the modal's accessible name and focus handling. Esc or Close cancels the run and records nothing beyond the upload itself.
- [x] 2.3 A quiet **"Skip to tender"** text link at the bottom, for a presenter who is short of time. It goes straight to the tender.
- [x] 2.4 At the end it closes the modal and navigates to the tender's **Overview** (`/tenders/:id`, the workspace's default tab; check the route in `pages/gcc/workspace`). Focus moves to the page heading.
- [x] 2.5 `prefers-reduced-motion`: the steps still run in order, but without typing or fade effects. Timing stays about the same, so the presenter's story doesn't change.
- [x] 2.6 The upload's existing writes are kept: `uploadWrite`, the audit entry, Reset demo clearing it. The toast fires at the end ("recognised as T-…"), not at the start. The intake modal's idle state (dropzone and demo files) keeps the "Files this demo holds" list. Remove the "Nothing is read live" sentence from it as well, and keep the small `DemoTag` on that list, which is a presenter control.
- [x] 2.7 Files the demo doesn't hold, and documents outside the viewer's role, keep today's results.
- [x] 2.8 Fits 1280 × 800 and 1440 × 900 without page scroll. The fields panel scrolls inside itself (`.eq-scroll`) if a record has many criteria. Works in light and dark.

### Phase 3 — Checks
- [x] 3.1 A dev check (new `84-extraction-run.tsx`, registered like the others), for every demo document in every tenant:
  - the script's durations add up to 18–22 s;
  - every revealed value exists in the record, register or eligibility result;
  - the last step names the right tender.

  About 4 rows per tenant.
- [x] 3.2 Click through, with screenshots and no console errors:
  - **Najd, Tender Coordinator:** Upload tender → "Wadi Zarqa" → the run → T-2026-120 Overview.
  - **Najd, Head of Tendering:** the hero booklet → T-2026-118.
  - **Batinah:** the Arabic booklet → T-2026-042.
  - **Corniche:** the hospital ITT → T-2026-061.
  - The same Wadi Zarqa file uploaded twice reads "Already uploaded …" at the match step and still opens the tender.
  - Settings → Reset demo clears the upload.

## Data and derivation
- No new facts. The script is derived from `documentFor`, the register row and `eligibilityFor`.
- No new `done` keys beyond the existing upload key.

## Demo-grade rules
- Build what the prospect sees; polish where the eye lands (the fields appearing).
- Non-negotiables: the same tender never disagrees between this screen and its pages; masking holds (a tender outside the viewer's role is never named); Reset works.

## Acceptance checks
- [x] typecheck and build pass.
- [x] The four click-throughs above work, at about 20 s each, with no console errors, at 1440 and 1280.
- [x] No hard-coded numbers in the view; no role checks outside `access.ts`.
- [x] Reset demo returns to the seed state.

## Execution report
(Executor, 2026-10-06.)

- **Changed files:**
  - new `src/domain/gcc/s1/extractionRun.ts`: `extractionRun(tenant, tenderId, record, { file, done, previous? })`, a pure step script. Every item carries its reveal time in ms from the drop; `runAt()` and `pagesText()` helpers; `RUN_TOTAL_MS = 20 000`.
  - new `src/pages/gcc/s1/ExtractionRun.tsx`: the processing view (step list left, fields right, one progress bar, "Skip to tender", a polite live region).
  - new `src/pages/gcc/s1/extraction-run.css`: its styles. The modal widens through `.modal:has(.xr)`, so `parts/Modal.tsx` is unchanged. Reduced-motion rules are included.
  - `src/pages/gcc/s1/UploadGcc.tsx`:
    - a recognised document the viewer may open plays the run, then the toast, `/tenders/:id` (Overview) and focus on `.wsh-title`;
    - Close or Esc cancels the run;
    - the "Nothing is read live" sentence is gone (the `DemoTag` on "Files this demo holds" stays);
    - the instant "Recognised" callout and its `IntakeSteps` are no longer reached for these files.
  - new `src/pages/gcc/dev-checks/84-extraction-run.tsx`: 4 rows per tenant, 20 in all, over every demo document in all five tenants.
- **The step script** (base shares; steps with nothing to reveal drop out and the rest scale to 20.0 s; every demo document keeps all 10 steps):
  1. Receiving the file, 1.4 s: format from the file name, pages, language.
  2. Reading pages, 3.2 s: a page strip and a "N of M" counter; for scanned records, the OCR pages (e.g. "pp. 15–17, read by OCR").
  3. Identifying the document, 2.2 s: type, issuer, parent, reference, issue date, country, contract. Pages and Arabic come from the matching field items.
  4. Key dates, 2.4 s: every `record.dates` entry with its page.
  5. Scope of work, 1.8 s: the first 3 lines, with "3 of N lines".
  6. Prequalification criteria, 3.4 s: every `record.eligibility` item, with a running "n found".
  7. Flags and risks, 2.0 s: every flag with its severity word and page.
  8. Checking against your company, 1.8 s, from `fitFor` and `recommendationFor` (live `done`):
     - the eligibility counts with the verdict word, or the register's "Not yet checked" reason when the tender has no requirements;
     - "fit · pursue at N";
     - the recommendation.
  9. Matching the register, 1.2 s: "Matched to T-… · title", "Captured from …", then "Already on the register: linked, not duplicated". On a repeat upload the last line reads "Already uploaded <when> by <who>: linked, not added again".
  10. Opening T-…, 0.6 s.
- **Verification:**
  - typecheck and build pass. Build shows only the existing chunk-size warning.
  - Dev check 84: all 20 pass. Fit equals the Overview row in every case (e.g. Najd hero 82.4, Wadi Zarqa 58.2, Corniche T-2026-061 73.5, Batinah T-2026-042 81). The hero gives its five answers: eligible / not eligible / eligible with JV / not eligible / eligible.
  - Click-throughs (Playwright, frames taken during each run, no console errors in any):
    - Najd Coordinator, Wadi Zarqa at 1440 × 900: lands on T-2026-120 Overview after about 20 s, focus on the heading, toast at the end;
    - Najd Head of Tendering, hero at 1280 × 800 → T-2026-118;
    - Batinah Coordinator, Arabic booklet at 1440 → T-2026-042, with the Arabic sources under the English;
    - Corniche Coordinator, hospital ITT at 1280 → T-2026-061;
    - Qurain, ccTLD in dark mode with reduced motion at 1280 → T-2026-071;
    - Wadi Zarqa a second time: "Already uploaded Sun 8 Mar 10:00 by Aisha Al-Qahtani: linked, not added again", then the tender opens. The upload stays one key;
    - Skip at 5 s opens the tender;
    - Esc at 4 s closes with no toast or navigation, and focus returns to Upload tender;
    - an unknown file still shows "Stopped after the page read";
    - Settings → Reset demo clears the upload key.
  - The modal ends at y = 749, so it fits at 1280 × 800 and 1440 × 900.
- **Deviations from plan:**
  - the header has no separate "Intake & Extraction agent" line beside the file name: it is the modal's eyebrow, with the file name as the title;
  - "size class" is not shown because the record holds no file size;
  - the focus target `.wsh-title` is an `h2` without `tabindex`, so the upload sets `tabindex="-1"` on it at runtime instead of editing `WorkspaceHeader.tsx`.
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - `/dev/checks` shows "Every tile has a detail and a reference line (plan 027e): 1 of 72 targets failing" in Najd, Corniche and Batinah. It is in dashboard tile files outside this plan; the orchestrator has uncommitted edits in `portfolio.dash.ts` and dev checks 50 and 51.
  - The audit detail still ends "(demo recognition by file name)", which is visible in the audit log (kept: an existing write).
  - After "A file the demo does not hold", focus falls to the page body inside the modal (existing behaviour).
