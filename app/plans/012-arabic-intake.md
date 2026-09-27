# 012 — Arabic intake: bilingual values, "Arabic prevails", "Read in English"

Status: DONE (2026-09-27, reviewed) · Depends on: 007b, 019, 023 (all in `gcc-demo`) · Can run in parallel with: 010, 014, 018

## Goal
Demo script E, "Arabic in, English out" (s1-s3-demo-spec §17): in Batinah (Oman), the presenter uploads the **scanned Arabic road tender** T-2026-042. The intake shows "OCR: pp. 15–17 read (scanned, stamped)". Every extracted field shows the **English value with the Arabic source beside it** and the page. The **"Arabic text prevails"** clause is raised as a flag. **"Read in English"** gives an English reading of the whole document, labelled a machine translation for understanding, not for submission. A Gulf buyer sees that Arabic-only tenders no longer wait for a translator. The Kuwaiti Arabic IT tender (T-2026-071, Qurain) shows the same display and its "out of sector" low fit.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **The Arabic is data.** Every Arabic string already lives in the extraction records (023's `source` fields). Nothing is translated at run time, and no translation library or API is added.
- **The UI stays English and LTR** (spec §12, ui-direction §8). Arabic appears as content only: `dir="rtl"`, `lang="ar"`, in IBM Plex Sans Arabic.
- **One shared component.** `BilingualValue` is built once in `components/tender/` and used everywhere. Pages don't build their own variant (ui-direction §6.2 rule).
- **Keep the dev check small:** about 10 rows.

## Context
- **Why:** s1-s3-demo-spec §12 (Arabic tenders), §17 script E, §19 ("Arabic documents show the English value with the Arabic source for every field"); ui-direction §6.2 (`LangBadge`, `BilingualValue`) and §8 (bilingual display, "Arabic text prevails" on the Requirements tab and the Overview, Arabic confidence reasons); gcc-demo-data §4B (T-2026-042).
- **Font:** `@fontsource/ibm-plex-sans-arabic` is **approved** (plans README), but not installed. Fonts are imported in `src/main.tsx:3-9`; font tokens are in `src/styles/tokens.css:60-61` (`--font-sans`, `--font-mono`). No Arabic font rule, `:lang(ar)` or `dir="rtl"` exists anywhere in `src`.
- **Records:**
  - Base types `src/data/extracted/types.ts:10-65`: `ExtractField`, `ExtractDate`, `ExtractClause {ref, title, summary, page}`, `ExtractFlag`; `ExtractedTender` has `language` and `scanned: boolean`, with no per-page list.
  - Arabic types `src/data/extracted/gcc/types-ar.ts:5-25`: `Src = { source: string }` on summary, dates, eligibility, scope, evaluation, submission, clauses, flags and the GCC field groups.
  - T-2026-042 is `src/data/extracted/gcc/ilra-042.ts`:
    - `language: 'Arabic'`, `scanned: true` (110-112);
    - OCR pages 15–17 appear only in `note` constants and `confidence: 'low'` (13-14);
    - `summary` (129-137) is "what plan 012's Read in English shows first";
    - clauses (170-186) have an English `summary` and an Arabic `source`; clause §7 Language (173) says the Arabic text prevails;
    - flag 0 (188) "Arabic-only document" also says so; flag 5 (193) is "Scanned pages read by OCR".
  - T-2026-071 (Qurain, Kuwaiti ccTLD, IT services, `disposition: 'low-fit'`) is `src/data/extracted/…/kw-cctld.ts`: `ExtractedTenderAr`, `scanned: false`; pages 38–61 are an English specification.
  - Registration: `src/data/extracted/gcc/index.ts:17-34`. Documents are read only through `domain/gcc/documents.ts` (`documentFor`, :37-55: `lang`, `scanned`, `record`; `isArabicRecord` :35, `isGccRecord` :32).
- **Screens today** (plan 007b):
  - `pages/gcc/workspace/tabs/requirements.tab.tsx`:
    - the header comment (26-27) says the bilingual view comes later;
    - `Fields` (60-82) renders `<span className="rq-v">{f.value}</span>` (68), then the SourceChip, confidence and note;
    - "prevails" is found by regex over the flags (114) and shown as a Callout (133);
    - for a GCC-shaped record such as T-2026-042 (`isGccRecord`, 137) it renders the groups and eligibility only. **Clauses, scope and summary are not shown**, and they are shown only in the non-GCC branch (156-160).
  - The Arabic `source` is **not displayed anywhere**.
  - Other slots:
    - `pages/gcc/s1/parts/ValidationCard.tsx:86-107`: the snippet from `snippetAt` (`s1/vm/docs.ts:15-32`) is built from English lines;
    - `KeyDateList.tsx:41`;
    - `components/tender/EligibilityLine.tsx`: requirement text only.
  - `LangBadge` exists (`components/tender/LangBadge.tsx:8-16`). OCR is a plain `wsh-badge` span (`workspace.css:25`) in `WorkspaceHeader.tsx:32`, `requirements.tab.tsx:121` and `documents.tab.tsx:88`.
- **Intake:**
  - `UploadGcc` recognises the ILRA file by name (`domain/gcc/s1/intake.ts:240-250`) and shows `IntakeSteps` for Batinah's event `IN-0308-01`.
  - `pipelineFor` (`intake.ts:84-137`) sets `needsOcr` from the **event language** (91), not the record, and says "18 pages read" (114). So the Kuwaiti tender, which is not scanned, also shows OCR.
- 023's follow-ups for this plan (`plans/023-demo-tender-oman-arabic.md:181`): the PDF highlight can't mark text on scanned pages, so show the OCR reading instead; script E could name T-2026-042.

## Scope
**Files to create:**
- `src/components/tender/BilingualValue.tsx` (+ styles in `tender.css`): `{ en: ReactNode; ar?: string; page?: number; doc?: SourceDoc; confidence?; reason? }`. The English value first; the Arabic source beneath it, or beside it at ≥1440 px, in `--font-arabic`, `dir="rtl"`, `lang="ar"`, muted, with the page chip. With no `ar` it renders exactly what the page renders today.
- `src/domain/gcc/arabic/`: `prevails.ts` (`prevailsOf(record)` → `{ ref, page, en, ar } | null`, from the language clause first, the flags second; for a bilingual record with no language clause → "The document doesn't say which language prevails"), `reading.ts` (`readingOf(record)`: the "Read in English" view model, in sections: headline facts (`summary`), scope, eligibility, dates, evaluation, submission, clauses, each with its page), `ocr.ts` (`ocrOf(record)` → `{ pages: number[], reasons }`), `index.ts`.
- `src/pages/gcc/workspace/parts/ReadInEnglish.tsx`: a `Sheet` (from `components/tender/Sheet.tsx`) with the reading, labelled at the top: "Machine translation for understanding, not for submission. The Arabic text is the tender."
- `src/pages/gcc/dev-checks/73-arabic.tsx`.

**Files to change (only these lines):**
- `app/package.json` and the lock file: add `@fontsource/ibm-plex-sans-arabic` (approved). `src/main.tsx`: import weights 400 and 500 only. `src/styles/tokens.css`: add `--font-arabic: 'IBM Plex Sans Arabic', var(--font-sans);` and one rule `:lang(ar) { font-family: var(--font-arabic); }`.
- `src/data/extracted/types.ts`: an optional `ocrPages?: number[]` on `ExtractedTender`. `src/data/extracted/gcc/ilra-042.ts`: `ocrPages: [15, 16, 17]`. No other record change; if a record needs more, stop and ask.
- `src/domain/gcc/s1/intake.ts`, in `pipelineFor` only: `needsOcr` from the record's `scanned` when a record exists (the event's `source.kind === 'scan'` still counts when none does); the OCR detail names the pages ("pp. 15–17 read: scanned and stamped"). Najd's T-2026-128 (a scanned letter with no record) keeps its OCR step.
- `pages/gcc/workspace/tabs/requirements.tab.tsx`:
  - `Fields` uses `BilingualValue`;
  - the GCC branch also shows the clauses (English summary with the Arabic original), scope and flags for an Arabic record;
  - a "Show Arabic sources" toggle for the whole tab (default on for Arabic records);
  - the prevails Callout reads `prevailsOf`;
  - a **Read in English** button opens the Sheet.
- `pages/gcc/workspace/tabs/documents.tab.tsx`: **Read in English** beside the document; the OCR badge names the pages.
- `pages/gcc/workspace/tabs/overview.tab.tsx`: an "Arabic text prevails" flag when `prevailsOf` returns one (ui-direction §8: the Requirements tab and the Overview). **Don't edit `WorkspaceHeader.tsx`**, because plan 014 edits it.
- `pages/gcc/s1/parts/ValidationCard.tsx`: for an Arabic record the snippet shows the Arabic source line under the English one, through `BilingualValue`.
- `pages/gcc/s1/parts/KeyDateList.tsx`: dates with a `source` use `BilingualValue`.
- `components/tender/SourceChip.tsx`: backward-compatible only. On a page listed in `ocrPages`, the tip says "Scanned page: the text was read by OCR, so it can't be highlighted" and shows the Arabic source when the caller passes one.

**Out of scope** (stop and ask): an Arabic or RTL interface; run-time translation; new Arabic records or tenders; changing 023's values or pages; eligibility rules; the DG1 pack layout (the pack reads the same fields and gets the display through `Fields` only if it already uses them: say which in the report); `EligibilityLine` beyond an optional `source` prop; new libraries other than the font.

## Steps

### Phase 1 — Font and component
- [x] 1.1 Install the font, import 400 and 500 in `main.tsx`, add `--font-arabic` and the `:lang(ar)` rule. (acceptance: an element with `lang="ar"` computes `font-family` starting with IBM Plex Sans Arabic; the English UI's font is unchanged.)
- [x] 1.2 `BilingualValue`, as specified in Scope. Long Arabic wraps inside its column; the page chip sits at the line's end (visually left for RTL text, but the chip stays in LTR order). At < 1440 px the Arabic sits under the English.
- [x] 1.3 Confidence reasons for Arabic and scans (ui-direction §8): "Handwritten amount", "Stamp over text", "Table read from a skewed scan", "Arabic-only clause". They come from the record's `note` or `confidence`; map 023's `OCR` and `STAMPED` notes to these sentences in `domain/gcc/arabic/ocr.ts`, not in the page.

### Phase 2 — The Requirements tab and the intake
- [x] 2.1 Requirements for T-2026-042: every field of every group shows the English value, the Arabic source and the page. The eligibility items do the same. Clauses show the English summary with the Arabic original. The scope, the flags and the dates show theirs.
- [x] 2.2 The "Show Arabic sources" toggle hides and shows every Arabic line at once. It is local state per tab, not a done key.
- [x] 2.3 The prevails flag: `prevailsOf` finds clause §7 (p. per the record) and the Callout quotes both languages ("Arabic text prevails (clause 7, p. N): «…»"). The regex on the flags stays only as a fallback inside `prevailsOf`.
- [x] 2.4 The intake: uploading the ILRA file as Batinah's Bid Manager shows the steps with "Language: Arabic" and "OCR: pp. 15–17 read: scanned and stamped". The Kuwaiti tender's steps show no OCR (it isn't scanned). Najd's T-2026-128 keeps its OCR step.
- [x] 2.5 The Kuwaiti tender T-2026-071 (Qurain): the non-GCC branch of the Requirements tab uses `BilingualValue` too. English-spec pages (38–61) show no Arabic line, because their `source` is English: show the source only when it contains Arabic script (`/[؀-ۿ]/`).

### Phase 3 — "Read in English" and the other slots
- [x] 3.1 `readingOf` and the `ReadInEnglish` sheet: sections in the order of Scope; each item with its page chip opening the PDF at that page; the label at the top; a "Show the Arabic beside it" switch. It opens from the Requirements and Documents tabs. Esc closes it; the focus returns to the button.
- [x] 3.2 The prevails flag on the Overview tab for T-2026-042 and T-2026-071.
- [x] 3.3 The intake queue's `ValidationCard` for T-2026-042's conflicts shows the Arabic source line in the snippet.
- [x] 3.4 `KeyDateList` for T-2026-042 shows the Arabic dates' sources.
- [x] 3.5 `SourceChip` on pages 15–17 gives the OCR tip instead of a highlight that can't work.

### Phase 4 — Dev check and polish
- [x] 4.1 `73-arabic.tsx`, about 10 rows:
  - every field and clause of T-2026-042 has an Arabic `source` that `BilingualValue` would render;
  - `prevailsOf` finds the language clause for T-2026-042 and T-2026-071;
  - `ocrOf(ILRA_042).pages` is [15, 16, 17];
  - `pipelineFor` gives T-2026-071 no OCR step and T-2026-128 one;
  - `readingOf` covers every group, with no empty section;
  - the English-spec pages of T-2026-071 carry no Arabic line.
- [x] 4.2 Najd, Corniche and Dafna (English tenders) look exactly as before: no Arabic lines, no toggle, no Read in English.
- [x] 4.3 1440 and 1280, light and dark, no console errors. The Arabic reads at the same size as the English body text, and the muted colour passes contrast (the tokens' muted ink on the surface).

## Data and derivation
- One new optional record field, `ocrPages`, set on T-2026-042 only. Everything else is read from 023's records.
- Derived: `domain/gcc/arabic/*` (`prevailsOf`, `readingOf`, `ocrOf`).
- No done keys. The toggles are local UI state, so Reset demo has nothing new to clear.

## Acceptance checks
- [ ] typecheck and build pass (**my files are clean and `vite build` passes; `tsc -b` fails only in plan 010's in-progress files, see Blockers**); `/dev/checks` passes in all five tenants ✓; `npm run demo-itt:ilra` still passes (the PDF is untouched) ✓.
- [x] Script E as Batinah's Bid Manager (the upload as the Coordinator: deviation 1): upload the ILRA file → the intake steps show Arabic and OCR pp. 15–17 → open the tender → Requirements shows every field in English with the Arabic source and page → the "Arabic text prevails" flag quotes clause 7 → Read in English opens the labelled reading → a page chip opens the PDF at that page.
- [x] As Qurain's Head of Tendering: T-2026-071 shows bilingual fields and its low fit; no OCR step.
- [x] The English tenders are unchanged (except the hero's Overview flag: deviation 2).
- [x] No hard-coded numbers or Arabic strings in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-27.)

- **Changed files:**
  - Created: `src/components/tender/BilingualValue.tsx` (`BilingualValue` and `ArabicToggle`); `src/domain/gcc/arabic/{index,sources,ocr,prevails,reading}.ts`; `src/pages/gcc/workspace/parts/ReadInEnglish.tsx`; `src/pages/gcc/dev-checks/73-arabic.tsx`.
  - Changed: `app/package.json` and `package-lock.json` (`@fontsource/ibm-plex-sans-arabic` ^5.3.0 only); `src/main.tsx` (weights 400 and 500); `src/styles/tokens.css` (`--font-arabic` and `:lang(ar)`); `src/components/tender/tender.css` (BilingualValue, toggle, list and reading styles); `src/components/tender/SourceChip.tsx` (optional `scanned` and `arabic` on `SourceChipRef`, the OCR tip); `src/data/extracted/types.ts` (`ocrPages?`); `src/data/extracted/gcc/ilra-042.ts` (`ocrPages: [15, 16, 17]`, nothing else); `src/domain/gcc/s1/intake.ts` (`pipelineFor`'s OCR step only); the Requirements, Documents and Overview tabs; `src/pages/gcc/s1/parts/ValidationCard.tsx`; `src/pages/gcc/s1/parts/KeyDateList.tsx`.
  - Not touched: `WorkspaceHeader.tsx`, `EligibilityLine.tsx`, `Sheet.tsx`, the DG1 pack, `access.ts`, any record value or page.
- **Verification** (dev server on port 5182, headless Chrome driven over the DevTools protocol from a scratch script, its own browser profile; nothing on 5173):
  - `/dev/checks` in all five tenants: 0 failing rows, 0 crashed panels (Najd 703, Corniche 295, Dafna 277, Batinah 284, Qurain 300 passing rows, other wave 5 panels included). `73-arabic` passes 12 of 12 everywhere.
  - `npm --prefix app run demo-itt:ilra`: 46 of 46; the rebuilt PDF is byte-identical (`git status` clean under `public/`).
  - `tsc -b`: no error in any file of this plan; it fails only in plan 010's in-progress files (see Blockers). `vite build` (to a scratch folder, not `app/dist`) passes and bundles the Arabic font subsets.
  - Script E: the Coordinator Shamsa Al-Hinai uploads the ILRA file → steps "Language detected: Arabic…" and "OCR: pp. 15–17 read: scanned and stamped", 11 min → as the Bid Manager Imran Sheikh: Documents shows "OCR: pp. 15–17 scanned" and Read in English; Requirements shows 78 rows with 96 Arabic lines (every field, eligibility row, clause, scope line and flag), the page chip at the end of each Arabic line, "Low confidence: table read from a skewed scan / stamp over text / scanned page read by OCR"; the callout reads "Arabic text prevails (§7, p. 5)" with the English and Arabic quotes; "Show Arabic sources" hides all 96 and restores them; Read in English opens with the label, 7 sections (7 · 11 · 9 · 8 · 3 · 9 · 15 items), the switch adds 62 Arabic lines, a p. 9 chip opens the PDF at p. 9 over the sheet, Esc closes the viewer then the sheet, and focus returns to the button; the p. 17 chip shows the OCR tip with the Eastern-digit Arabic and opens the scanned page; Overview shows "Arabic text prevails (§7)" with p. 5; Key dates show the Arabic for 9 of 9 dates (p. 17 with the OCR tip); the intake queue's VAL-042-1 snippets show the Arabic on p. 5 and p. 17, VAL-042-2 on p. 9.
  - Qurain, Bader Al-Mutawa (Head of Tendering), T-2026-071: OCR "Not needed"; Requirements bilingual (78 Arabic lines); the 2 rows cited on pp. 38–61 show no Arabic; the callout reads "No clause says which language prevails" with the flag's text; Overview shows the same flag with p. 38 and Fit 39 against Pursue at 70; Read in English has all 7 sections.
  - English tenders (Najd T-2026-118 and T-2026-120, Corniche T-2026-061 and T-2026-118, Dafna T-2026-118, Batinah T-2026-041), on the Overview, Documents, Requirements and Key dates tabs: 0 Arabic lines, 0 toggles, 0 Read in English buttons, 0 OCR chips; the hero's Requirements callout is word for word as before. With no Arabic, `BilingualValue` returns the same element the page rendered before.
  - 1440 and 1280, light and dark: side by side at 1440, stacked at 1280. The Arabic is in IBM Plex Sans Arabic at the English value's size; the body font is unchanged. The muted ink `--ink-3` is about 7.5:1 on white and about 8.6:1 on the dark surface.
  - Keyboard: Enter opens the sheet with focus on Close; Tab reaches the switch; Space toggles it; the chips show the focus ring; Esc closes the sheet and returns focus. Console: only React Router's existing future-flag warnings.
  - Reset demo (Settings → Reset this company, my profile only) removes the upload record; the Arabic display is seed data. No done keys were added.
- **DG1 pack:** it doesn't use the Requirements tab's `Fields`, so it gets no bilingual display. It uses `KeyDateList` in compact mode, which shows no Arabic line (layout unchanged). Only T-2026-042's p. 17 chip there now gives the OCR tip.
- **Deviations from plan:**
  1. **Script E upload persona.** Batinah's Bid Manager doesn't hold `tender.create` (`access.ts`: the Head of Tendering and the Coordinator do), so the Upload button is hidden for that role. I uploaded as the Coordinator and ran the rest as the Bid Manager. Access is unchanged.
  2. **The hero's Overview gains the flag.** `prevailsOf` returns the hero's §27 ("the Arabic text shall prevail"), which gcc-demo-data §4.1 says "triggers the M-8 flag even on an English document", and ui-direction §8 puts it on the Overview. So the hero's Overview in every tenant shows "Language: Arabic text prevails (§27) p. 9". Its Requirements callout keeps its old title and text exactly. To limit the Overview flag to Arabic documents, add `tenderDoc?.lang === 'ar' &&` in `overview.tab.tsx` (one condition).
  3. **`prevailsOf` result shape.** It adds `kind: 'arabic' | 'unstated'` and an optional `flag` (the matching flag's detail) to `{ ref, page, en, ar }`, so T-2026-071's "doesn't say" case and the hero's old wording can both render. `prevailsTitle(p, { page })` gives the callout and Overview titles.
  4. **The reading's label.** I used the plan's sentence, not ui-direction §8's variant. A sticky label would slide under the drawer's own sticky header, so its short form is the sheet's eyebrow ("Read in English · machine translation, not for submission"), which stays in view while scrolling. The sheet has one item, so a `:has(.rie)` rule in `tender.css` hides its "1 of 1" and prev/next buttons; `Sheet.tsx` is not edited. The sheet's title is the record's `shortName`; the Arabic title sits above the working title, per ui-direction §8.
  5. **`BilingualValue` props beyond Scope:** `terms`, `scanned`, `show` (the page's switch) and `className` (the class the English value had; with the Arabic it goes on the pair, so both read at one size). `ArabicToggle` (ui-direction §6.2's "toggle to show all sources") lives in the same file.
  6. **Reasons.** The four sentences are mapped, plus a fifth, "Scanned page read by OCR", for OCR'd values that are neither a table nor stamped (pp. 16–17), where none of the four fits. No record note uses "Handwritten amount" or "Arabic-only clause". In the Requirements tab the reason goes into the confidence pill ("Low confidence: stamp over text"); the sheet uses `BilingualValue`'s `reason`.
  7. **`domain/gcc/arabic/sources.ts`** (inside the owned folder) holds `arabicOf`, `fieldsOf`, `bilingualSnippet` and `dateArabicOf`. `bilingualSnippet` also finds the p. 17 bond-form line for "OMR 300,000 (fixed amount)", by the value without its bracket, which had no English snippet before. English records keep `snippetAt` unchanged.
  8. **Layout choices.** The Scope section is added to the GCC branch for Arabic records only; T-2026-071's non-GCC branch gets no Scope section (its scope is in Read in English). On the Key dates list the Arabic goes on the row's full-width note line (the date column sizes to its content), with no second chip. The OCR badges read "OCR pp. 15–17" (Requirements) and "OCR: pp. 15–17 scanned" (Documents).
- **Blockers / questions:**
  - `tsc -b` fails in plan 010's in-progress files, not in this plan's: `domain/gcc/company/renewal.ts` and `vault.ts` import `RenewedValue` from `s1/done`, and `pages/gcc/company/Company.tsx` imports modules not yet written. I re-ran it three times over the session. Please re-run typecheck once 010 lands.
  - For the orchestrator: keep or drop the hero's Overview flag (deviation 2)? Should the Bid Manager be able to upload for script E (deviation 1)?
- **Follow-ups noticed (not done):**
  - Arabic outside `lang="ar"` spans uses the system Arabic font: the Arabic file name in the upload modal title, its toast, and Documents' "Uploaded by…" line. Adding `'IBM Plex Sans Arabic'` after `'IBM Plex Sans'` in `--font-sans` would fix it everywhere with Latin unchanged, but this plan limited `tokens.css` to two lines.
  - `PdfViewer.tsx` (~l. 78) skips text runs with fewer than two Latin letters or digits, so Arabic words never highlight. On an Arabic page only the Western digits a term carries can light up.
  - ui-direction §8's "Arabic title with an English working title underneath" is shown in the reading, not on the Documents tab's card ("Tender document ILRA/RD/2026/042").
  - Some English notes quote Arabic inline (T-2026-042's "Parent entity" note, "(الجهة المالكة)"). Those words aren't wrapped in `lang="ar"`, because the note is a single data string.
