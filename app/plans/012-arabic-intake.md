# 012 — Arabic intake: bilingual values, "Arabic prevails", "Read in English"

Status: READY · Depends on: 007b, 019, 023 (all in `gcc-demo`) · Can run in parallel with: 010, 014, 018

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
- [ ] 1.1 Install the font, import 400 and 500 in `main.tsx`, add `--font-arabic` and the `:lang(ar)` rule. (acceptance: an element with `lang="ar"` computes `font-family` starting with IBM Plex Sans Arabic; the English UI's font is unchanged.)
- [ ] 1.2 `BilingualValue`, as specified in Scope. Long Arabic wraps inside its column; the page chip sits at the line's end (visually left for RTL text, but the chip stays in LTR order). At < 1440 px the Arabic sits under the English.
- [ ] 1.3 Confidence reasons for Arabic and scans (ui-direction §8): "Handwritten amount", "Stamp over text", "Table read from a skewed scan", "Arabic-only clause". They come from the record's `note` or `confidence`; map 023's `OCR` and `STAMPED` notes to these sentences in `domain/gcc/arabic/ocr.ts`, not in the page.

### Phase 2 — The Requirements tab and the intake
- [ ] 2.1 Requirements for T-2026-042: every field of every group shows the English value, the Arabic source and the page. The eligibility items do the same. Clauses show the English summary with the Arabic original. The scope, the flags and the dates show theirs.
- [ ] 2.2 The "Show Arabic sources" toggle hides and shows every Arabic line at once. It is local state per tab, not a done key.
- [ ] 2.3 The prevails flag: `prevailsOf` finds clause §7 (p. per the record) and the Callout quotes both languages ("Arabic text prevails (clause 7, p. N): «…»"). The regex on the flags stays only as a fallback inside `prevailsOf`.
- [ ] 2.4 The intake: uploading the ILRA file as Batinah's Bid Manager shows the steps with "Language: Arabic" and "OCR: pp. 15–17 read: scanned and stamped". The Kuwaiti tender's steps show no OCR (it isn't scanned). Najd's T-2026-128 keeps its OCR step.
- [ ] 2.5 The Kuwaiti tender T-2026-071 (Qurain): the non-GCC branch of the Requirements tab uses `BilingualValue` too. English-spec pages (38–61) show no Arabic line, because their `source` is English: show the source only when it contains Arabic script (`/[؀-ۿ]/`).

### Phase 3 — "Read in English" and the other slots
- [ ] 3.1 `readingOf` and the `ReadInEnglish` sheet: sections in the order of Scope; each item with its page chip opening the PDF at that page; the label at the top; a "Show the Arabic beside it" switch. It opens from the Requirements and Documents tabs. Esc closes it; the focus returns to the button.
- [ ] 3.2 The prevails flag on the Overview tab for T-2026-042 and T-2026-071.
- [ ] 3.3 The intake queue's `ValidationCard` for T-2026-042's conflicts shows the Arabic source line in the snippet.
- [ ] 3.4 `KeyDateList` for T-2026-042 shows the Arabic dates' sources.
- [ ] 3.5 `SourceChip` on pages 15–17 gives the OCR tip instead of a highlight that can't work.

### Phase 4 — Dev check and polish
- [ ] 4.1 `73-arabic.tsx`, about 10 rows:
  - every field and clause of T-2026-042 has an Arabic `source` that `BilingualValue` would render;
  - `prevailsOf` finds the language clause for T-2026-042 and T-2026-071;
  - `ocrOf(ILRA_042).pages` is [15, 16, 17];
  - `pipelineFor` gives T-2026-071 no OCR step and T-2026-128 one;
  - `readingOf` covers every group, with no empty section;
  - the English-spec pages of T-2026-071 carry no Arabic line.
- [ ] 4.2 Najd, Corniche and Dafna (English tenders) look exactly as before: no Arabic lines, no toggle, no Read in English.
- [ ] 4.3 1440 and 1280, light and dark, no console errors. The Arabic reads at the same size as the English body text, and the muted colour passes contrast (the tokens' muted ink on the surface).

## Data and derivation
- One new optional record field, `ocrPages`, set on T-2026-042 only. Everything else is read from 023's records.
- Derived: `domain/gcc/arabic/*` (`prevailsOf`, `readingOf`, `ocrOf`).
- No done keys. The toggles are local UI state, so Reset demo has nothing new to clear.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants; `npm run demo-itt:ilra` still passes (the PDF is untouched).
- [ ] Script E as Batinah's Bid Manager: upload the ILRA file → the intake steps show Arabic and OCR pp. 15–17 → open the tender → Requirements shows every field in English with the Arabic source and page → the "Arabic text prevails" flag quotes clause 7 → Read in English opens the labelled reading → a page chip opens the PDF at that page.
- [ ] As Qurain's Head of Tendering: T-2026-071 shows bilingual fields and its low fit; no OCR step.
- [ ] The English tenders are unchanged.
- [ ] No hard-coded numbers or Arabic strings in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
