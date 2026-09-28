# 028 — Status without stripes: the rest of the GCC screens

Status: DONE (2026-09-28, reviewed) · Depends on: wave 8 (commit 10de455) and the orchestrator's wave 9 contract · Can run in parallel with: 027a, 027b, 027c, 027d (shared-file rules below)

## Goal
No GCC screen shows status as a coloured stripe down one side of a card, row or note. After wave 9 the dashboards use a status word in a pill. This plan brings the same visual language to every other GCC screen:
- a **flagged card or row** shows its status as a word (the pill most of them already have), and where the card needs weight, a soft tint with a hairline border **all the way round**;
- a **flagged sentence** starts with a small "!" glyph in the tone colour, with no rule beside it;
- a **quote** (a document snippet, a query's text, the recommendation's words) sits in a quiet sunken box, with no rule;
- a **callout** keeps its icon and word, with a full tinted border instead of the left bar.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Presentation only.** No new facts, rules, `done` keys, capabilities or libraries. Change CSS and, where a word is missing, markup.
- **Status is never colour alone** (ui-direction §3.1). Removing a stripe must not remove information: if a card relied on the stripe alone, give it a word first. Most already have one (the Context table says which).
- **Restyle in place.** Keep class names, so other users of a class get the new look without edits. The exception is a class you replace with the new `FlagLine` component.
- **The Indian preview stays untouched.** `pages/roles/**`, `components/pipeline/**` and `styles/charts.css` are legacy. If a class you change (`.callout`) is also used by a legacy screen, make the change for GCC only (a modifier class on the GCC component), and check that the legacy screen looks as before.
- **No dev checks needed.** All `/dev/checks` rows that exist today must still pass in the five tenants.
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** the user, 2026-09-28: "I don't like the colour on the left side. We want to show warning and all that status, but there should be a better way of doing that." Wave 9 fixes the dashboards (plans 027a and 027d), the calendar (027b) and Company (027c). The user asked for this plan to do the rest.
- **The stripes left after wave 9:**

  | Where (screen) | Class, file | What it flags | Word already there? |
  | --- | --- | --- | --- |
  | Callout (DG1 pack, workspace, gates) | `.callout`, `.v-route`, `.v-stale`, `.v-block`, `.v-verdict` in `components/tender/tender.css` about 69–86 | waiting, stale, hard block, decision on record | yes: the icon and the word ("Hard block") |
  | Read in English sheet | `.rie-label`, `tender.css` about 326 | machine translation, Arabic prevails | yes: bold lead words |
  | Members panel (DG2) | `.mp-coi`, `components/tender/members-panel.css` about 44 | a conflict of interest | check `MembersPanel.tsx` |
  | Intake queue card | `.vq.conflict`, `pages/gcc/s1/s1.css` about 94 | two readings disagree | yes: the "! Conflict" pill (`ValidationCard.tsx` about 30) |
  | Intake queue snippet | `.vq-snip`, `s1.css` about 108 | the document text (a quote) | n/a |
  | Key dates flags | `.kd-flag`, `s1.css` about 181 (`parts/KeyDateList.tsx`) | Ramadan hours, weekend, closure | the text; the calendar prefixes "! " |
  | Queries | `.qy-text`, `s1.css` about 197 (`parts/QueryList.tsx`) | the query's text (a quote) | n/a |
  | Requirements flags | `.rq-flag.sev-high`, `.sev-medium`, `s1.css` about 218–219 (`workspace/tabs/requirements.tab.tsx`) | the extraction's flagged clauses | yes: the severity pill (about 114) |
  | Shortlists, levelling, best fit | `.s2-over`, `pages/gcc/s2/s2.css` about 19 | an override note | check each file |
  | Clarifications | `.s2-clar.stale`, `s2.css` about 186 (`inset` shadow) | stale beyond the SLA | yes: the "Stale: due …" tag (`Clarifications.tsx` about 43) |
  | Levelling adjustments | `.s2-adj.s-proposed`, `s2.css` about 201 (`inset` shadow) | proposed, not yet confirmed | check `LevelQuote.tsx` |
  | Bid pack sections | `.pk-sec.f-stale`, `.f-waiting`, `pages/gcc/s3/s3.css` about 74–75 | stale, waiting for an input | yes: `FreshBadge` (`sections/Section.tsx` about 16–22) |
  | Bid pack recommendation | `.pk-quote`, `s3.css` about 195 | the recommendation's words (a quote) | n/a |
  | Workspace rail | `.rl-flagline`, `pages/gcc/workspace/workspace.css` about 109 | a flagged line under an action | the text |
  | DG3 evidence | `.dg3-line.s-fail`, `pages/gcc/dg3/dg3.css` about 14–17 | a failing evidence line | yes: the "! Fails" pill (`Evidence.tsx` about 17) |
  | Platform Console | `.plc-promise`, `pages/platform/platform.css` about 82 | none (decoration) | n/a |

- **Wave 9 owns** `components/dashboard/**` (027a, 027d), `pages/gcc/company/**` (027c; the credential rows' stripes go there), and `pages/gcc/calendar/**` (027b). Not yours.
- **Tokens:** the orchestrator added `--orange-line` and `--cyan-line` for this plan (beside `--red-line`, `--green-line` and the wave 9 `--violet-line`). **Don't edit `tokens.css`**; if a colour is missing, stop and ask.
- **Kept on purpose, not status:** the selected table row's brand bar (`.tgrid .ag-row-selected::before`, 027's files) and the sidebar's current-page marker (`styles/layout.css` about 53). They mark where you are, not a warning. Leave them.

## The four patterns
1. **Flagged card or row:** remove the one-sided border or `inset` shadow. Keep or add the word pill in its header. Where the state needs weight (a hard block, a conflict, a failing line), use the tone's soft background and a 1 px border in the tone's `-line` token all the way round, with the normal radius. Otherwise the card stays plain.
2. **Flagged sentence:** a new kit component, `components/tender/FlagLine.tsx`: `<FlagLine tone="orange">text</FlagLine>` renders a small "!" (or ✕ for red) in the tone colour, `aria-hidden`, then the text. The component doesn't add "Warning:" for screen readers; the sentence says it. Replace `.kd-flag`, `.rl-flagline`, `.s2-over` and `.mp-coi` markup with it, or restyle those classes to the same look if their markup is shared with a wave 9 file (`.kd-flag` is used by the calendar; keep the class working).
3. **Quote:** `--surface-sunken` background, `--radius-sm` all round, no rule. Add a small muted caption where the quote has a source ("Page 12", "Query sent 3 Mar"), only if the markup already knows it.
4. **Callout:** remove `border-left`. `v-route` and `v-stale` take `--orange-soft` with an `--orange-line` border; `v-block` `--red-soft` with `--red-line` (as today, minus the bar); `v-verdict` stays neutral (`--line`). The icon tile and the word stay.

## Scope
- **Files to create or change:**
  - new `components/tender/FlagLine.tsx`, with its rules in `tender.css`;
  - `components/tender/tender.css`: **only** the `.callout*` rules, `.rie-label`, and the new `.flag-line` rules. Plan 027a may add a compact size for `.status-pill` in the same file: use targeted edits and re-read before each; never rewrite the file;
  - `components/tender/members-panel.css` and `MembersPanel.tsx` (the conflict note);
  - `pages/gcc/s1/s1.css`: **only** `.vq.conflict`, `.vq-snip`, `.kd-flag`, `.qy-text`, `.rq-flag*`. Plan 027b deletes the `.cal*` rules of the same file: targeted edits only;
  - `pages/gcc/s1/parts/KeyDateList.tsx`, `QueryList.tsx`, `ValidationCard.tsx` (only if markup must change);
  - `pages/gcc/workspace/tabs/requirements.tab.tsx`, `pages/gcc/workspace/Rail.tsx` (the flag line only), `pages/gcc/workspace/workspace.css` (`.rl-flagline`);
  - `pages/gcc/s2/s2.css` (`.s2-over`, `.s2-clar.stale`, `.s2-adj.s-proposed`), `Shortlists.tsx`, `LevelQuote.tsx`, `BestFit.tsx` (the override note, and a "Proposed" word on adjustments if missing);
  - `pages/gcc/s3/s3.css` (`.pk-sec.f-*`, `.pk-quote`);
  - `pages/gcc/dg3/dg3.css` (`.dg3-line*`);
  - `pages/platform/platform.css` (`.plc-promise`);
  - `pages/gcc/dev/KitPreview.tsx`: one `FlagLine` example;
  - `docs/07-product-design/agr-product-definition/ui-direction.md`: the Callout row of §6.2 and one line in §3.1 ("Status is never a one-sided stripe: a word, and a full tint where it needs weight").
- **Out of scope** (stop and ask before touching):
  - everything wave 9 owns: `components/dashboard/**`, `pages/gcc/company/**`, `pages/gcc/calendar/**`, `pages/gcc/suppliers/**`;
  - the legacy Indian screens and styles;
  - the selected-row bar and the sidebar marker (kept, see Context);
  - `tokens.css`.

## Steps

### Phase 1 — The kit
- [x] 1.1 `FlagLine.tsx`: props `tone: 'orange' | 'red' | 'cyan'`, `children`, optional `className`. Glyph "!" for orange and cyan, "✕" for red, 11 px bold in the tone colour, then the text at the parent's size. Inline-flex, the glyph top-aligned with the first line.
- [x] 1.2 Callout (pattern 4). If `.callout` is also styled or used by a legacy screen (`pages/roles/Comp.tsx` about 53 uses `callout ${gate.cls}`), scope the new rules to the GCC component (add a `gc` modifier in `Callout.tsx`) and check the Indian preview's Compliance screen as `gen-in`.
- [x] 1.3 `.rie-label`: `--cyan-soft` with a `--cyan-line` border all round, no left bar.
- [x] 1.4 Add a `FlagLine` example to the kit preview.

### Phase 2 — Stage 1 and the workspace
- [x] 2.1 Intake queue: `.vq.conflict` per pattern 1 (orange tint, `--orange-line` border); the "! Conflict" pill stays. `.vq-snip` per pattern 3.
- [x] 2.2 Key dates: flags per pattern 2. The calendar (plan 027b) may still use `.kd-flag`: keep the class and restyle it (no border, the glyph via `::before` only where the markup has none). Check the DG1 pack's key dates, the workspace's Key dates tab, and the calendar's agenda if 027b has landed.
- [x] 2.3 Queries: `.qy-text` per pattern 3.
- [x] 2.4 Requirements tab: `.rq-flag` loses the severity stripe; the severity pill carries it. A high flag gets the red tint of pattern 1, a medium one stays plain.
- [x] 2.5 Workspace rail: `.rl-flagline` becomes a `FlagLine`.

### Phase 3 — Stage 2, Stage 3 and the gates
- [x] 3.1 Shortlists, levelling and best fit: `.s2-over` becomes a `FlagLine`.
- [x] 3.2 Clarifications: `.s2-clar.stale` loses the inset stripe; the "Stale: due …" tag stays; the row gets a faint `--red-soft` background.
- [x] 3.3 Levelling adjustments: `.s2-adj.s-proposed` loses its stripe. If the row doesn't already say "Proposed", add a tag with that word (the existing `Tag` in `pages/gcc/s2/ui.tsx`).
- [x] 3.4 Bid pack: `.pk-sec.f-stale` and `.f-waiting` lose the stripe; `FreshBadge` carries the state; the section header gets a faint `--orange-soft` background. `.pk-quote` per pattern 3.
- [x] 3.5 DG2 members panel: the conflict-of-interest note becomes a `FlagLine`.
- [x] 3.6 DG3 evidence: `.dg3-line.s-fail` per pattern 1 (red tint, `--red-line` all round); the "! Fails" pill stays.
- [x] 3.7 Platform Console: `.plc-promise` loses its accent bar; its icon tile keeps the accent.

### Phase 4 — Sweep and spec
- [x] 4.1 Search the GCC code for any one-sided coloured border or `inset … 0 0` shadow left (`border-left`, `border-right`, `box-shadow: inset`), outside the wave 9 folders and the two kept markers. Fix each one, or list it under Deviations with why it stays.
- [x] 4.2 ui-direction.md §3.1 and §6.2, as in Scope.

## Data and derivation
None. No new `done` keys; Reset is unaffected.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row.
- [x] Najd, at 1440, light and dark, no console errors, as the persona each screen needs:
  - [x] Intake queue (Aisha Al-Qahtani): the hero's conflict card is tinted orange with a border all round, and the "! Conflict" pill;
  - [x] the hero's DG1 pack (Omar Siddiqui): callouts have no left bar; key-date flags read "! Ramadan …";
  - [x] the hero's workspace: Requirements flags, Queries and the rail;
  - [x] Stage 2 on T-2026-104 (Procurement Lead): shortlist override note, clarifications (a stale one), levelling adjustments (a proposed one);
  - [x] Stage 3 on T-2026-097: a stale or waiting pack section, the recommendation quote, the members panel;
  - [x] DG3 on T-2025-305 (Faisal Al-Harbi): a failing evidence line, if the seed has one (Qurain's guarantee catch does);
  - [x] Batinah T-2026-042's "Read in English" sheet;
  - [x] the Platform Console.
- [x] The Indian preview (`gen-in`): its Compliance screen and any callout look as before.
- [x] Reset demo returns everything to seed.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-28.)
- **Changed files** (all under `app/src/` unless noted):
  - new `components/tender/FlagLine.tsx`: `tone` (`orange | red | cyan`), `children`, `className`, and an optional `as` (`span` by default, `p` where the line replaces a paragraph);
  - `components/tender/Callout.tsx`: the `gc` modifier;
  - `components/tender/tender.css`: `.callout.gc` and the variant rules (tint and `-line` border all round, no bar), `.flag-line` rules, `.rie-label` (cyan tint, `--cyan-line` all round); and, from the 4.1 sweep, `.rec-card` and `.el-line` lose their `::before` bars (see Deviations);
  - `components/tender/MembersPanel.tsx` and `members-panel.css`: the conflict note is a `FlagLine`; `.mp-comment` is a quiet quote (sweep);
  - `pages/gcc/s1/s1.css`: `.vq.conflict` (now `:not(.resolved)`), `.vq-snip`, `.kd-flag`, `.qy-text`, `.rq-flag.sev-high` (`.sev-medium` removed);
  - `pages/gcc/s1/parts/KeyDateList.tsx`, `pages/gcc/workspace/Rail.tsx`: flags render as `FlagLine`; `pages/gcc/workspace/workspace.css`: `.rl-flagline` loses its border;
  - `pages/gcc/s2/s2.css`: `.s2-over`, `.s2-over-tag`, `.s2-clar.stale`, `.s2-adj.s-proposed` (removed), and from the sweep `.s2-rule` and `.s2-plan li`; `Shortlists.tsx`, `LevelQuote.tsx`, `BestFit.tsx`: the override notes are `FlagLine`s;
  - `pages/gcc/s3/s3.css`: `.pk-sec.f-stale` and `.f-waiting` (an orange header band, the whole card when folded), `.pk-quote`;
  - `pages/gcc/dg3/dg3.css`: `.dg3-line.s-fail`; `pages/platform/platform.css`: `.plc-promise`;
  - `pages/gcc/dev/KitPreview.tsx`: a "Flag line" card after the Callout card;
  - `docs/07-product-design/agr-product-definition/ui-direction.md`: §3.1 and the §6.2 Callout row;
  - not changed, because CSS was enough: `QueryList.tsx`, `ValidationCard.tsx`, `requirements.tab.tsx`.
- **Verification:**
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (the chunk-size warning was already there).
  - `/dev/checks`: every panel header reads "All … pass / met" in Najd, Corniche, Dafna, Batinah and Qurain, and no panel crashed or logged a console error.
  - Screenshots at 1440 in a headless Chromium (my own browser context, on the shared dev server), light and dark, with no console errors:
    - intake queue as Aisha;
    - the DG1 pack as Omar (callouts, recommendation card, key dates "! Site visit … Ramadan …", eligibility lines);
    - the workspace's Requirements flags, Queries (as Aisha, who sees the read-only quote), Key dates and the rail;
    - Stage 2 as Joseph on T-2026-104 (levelling's proposed adjustment, the RFQ guardrail sentence, the reminders plan);
    - T-2026-097's stale pack sections and presenter's-note quote, and its DG2 members panel;
    - Qurain T-2025-428's failing DG3 guarantee line; T-2025-305 has none at seed;
    - Batinah T-2026-042's Read in English label; the Platform Console; Najd T-2026-119's two failing eligibility lines; the kit preview.
  - Seed gaps, and what I did instead:
    - T-2026-104 has no stale clarification at seed, so I checked the stale row on Dafna T-2026-019 (CL-019-01);
    - no seed has a shortlist or best-fit override, so I wrote one of each (`shortlist:T-2026-104:P-01`, `mix:T-2026-104`) into my headless context's `ctai.demo.v2`;
    - no seed has a presenter's note (`pack-note:T-2026-097`), so I wrote one the same way;
    - no seat declares a conflict, so as Saad Al-Shehri I declared one through the DG2 position form. Settings › Reset demo › "Reset this company" then cleared it (1 note, then 0).
  - The Indian preview as `gen-in.comp`: the Compliance callout is pixel-identical before and after. The only differing pixels are inside the "Open critical gap" button (render timing). No legacy screen uses the restyled kit classes.
  - No new numbers in pages, no role checks, no new `done` keys, no new tokens or libraries.
- **Deviations from plan:**
  1. **Two stripes the Context table missed, fixed in the 4.1 sweep:** `.rec-card::before` (the recommendation card's tone bar, on the DG1 pack, rail, Stage 1 sheets, best fit and the pack) and `.el-line::before` (eligibility lines). They are pseudo-element bars, so a `border-left` grep misses them. Both rule blocks are in `tender.css` outside 027a's `.status-pill`, and I changed CSS only. The verdict's glyph and word, and the line's state pill, carry the state. A failing eligibility line takes the red tint with a `--red-line` border all round (pattern 1); at-risk and interpretation lines are plain.
  2. **Also fixed in the sweep, in my own files:**
     - `.mp-comment`: a grey left rule on a quote; now pattern 3;
     - `.s2-rule`: the RFQ guardrail sentences had a bar in the tenant's accent, which wave 9 rules out; now a quiet box;
     - `.s2-plan li`: the reminders timeline showed sent versus planned by bar colour. The state word leads each step, so the bar is gone and "Sent" steps read in ink.
  3. **The legacy callout:** tender.css loads with the header (`GccSearch.tsx`), so its bare `.callout` rule has always reached the Indian Compliance callout, including its 3 px side border. To keep that screen exactly as before, the bare rule stays and the kit's look sits on `.callout.gc`. See Follow-ups.
  4. **Quotes have a hairline border:** `--surface-sunken` is within 2% of `--surface` and `--surface-2` in both themes (`#fbfbfd` against `#ffffff` and `#fdfdfe`; `#121214` against `#161618` and `#131315`), so a sunken fill alone would barely show, least of all for the snippets inside the intake card's `--surface-2` option boxes. Each quote (`.vq-snip`, `.qy-text`, `.pk-quote`, `.mp-comment`, `.s2-rule`) has a 1 px `--line` border all round.
  5. **Orange pills on an orange tint:** on the conflict card and on the stale pack header band, the orange pill (`! Conflict`, `Blocks DG1`, `FreshBadge`) had the same fill as its background and lost its shape. Inside those two containers only, it takes a surface fill with an `--orange-line` hairline. The same applies to the red "Stale: due …" tag on a stale clarification row.
  6. **A resolved conflict reads plain:** the tint applies to `.vq.conflict:not(.resolved)`. Before, a resolved conflict kept its orange bar under a dashed border.
  7. **3.3, no "Proposed" tag:** a proposed adjustment already shows the tag "To confirm" (`STATE_TAG.proposed` in `LevelQuote.tsx`), which states that state, so a second tag would repeat it.
  8. **FlagLine layout:** `display: flex` rather than inline-flex, because every flag line stands on its own line (several in one `div` would otherwise run together). The glyph is baseline-aligned with the first line. The margin reset is `:where(.flag-line)`, with zero specificity, so a page class such as `.s2-over` keeps its margin whatever order the CSS chunks load in. The optional `as` prop is new.
  9. **ui-direction §3.1:** the old bullet "Status carries through as a 3px left rule on rows and cards" contradicted the new rule, so I replaced it, not only added a line beside it. The replacement also records the four patterns and the two kept markers.
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - `pages/gcc/admin/admin.css` `.adm-rule::before`: a 2 px tick in the tenant's accent before each Administration rule sentence (`AdminKit.tsx`). It is outside my files. It could take the `.s2-rule` quiet box.
  - Kept on purpose, not status:
    - "where you are" markers: `.s2-grid .ag-row-selected::before` (like the kept `.tgrid` one) and `.bp-item.on::before` (branding preview);
    - neutral 1 px dividers: `.wsh-stage`, `.pk-tile + .pk-tile`, `.cmp-rowh`;
    - legacy: `styles/intake.css` `.xf-row` and `.xd li.due`, used only by the Indian `pages/Intake.tsx`.
  - The legacy Compliance callout has always picked up the kit's bare `.callout` rule (flex row, 3 px side border in `--red-line`), because tender.css is in the main bundle. Scoping the bare rule to `.gc` would give the Indian screen back its own `components.css` look (stacked title, text, action), but that changes the Indian screen.
  - `s3.css` `.pk-rate` (risk rating in pack 9.6) has no `align-self: start`, so the pill stretches to the row's height and reads as a tall blob. It was like this before this plan; the fix is one declaration.
  - ui-direction §6.2 could gain its own `FlagLine` row. Today the component is named in §3.1 and in the Callout row.
